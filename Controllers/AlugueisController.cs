using Locadora.Data;
using Locadora.Dtos;
using Locadora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Locadora.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlugueisController : ControllerBase
{
    private readonly LocadoraDbContext _context;

    public AlugueisController(LocadoraDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AluguelReadDto>>> GetAll()
    {
        var alugueis = await QueryComNomes().OrderByDescending(a => a.DataRetirada).ToListAsync();
        return Ok(alugueis);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AluguelReadDto>> GetById(int id)
    {
        var aluguel = await QueryComNomes().FirstOrDefaultAsync(a => a.Id == id);
        if (aluguel is null)
            return NotFound(new { message = $"Aluguel {id} não encontrado." });

        return Ok(aluguel);
    }

    // FILTRO 3 — GET api/alugueis/em-aberto?clienteId=
    // INNER JOIN explícito (method syntax, .Join) entre Aluguel, Cliente e Veiculo.
    // Só entram aluguéis com DataDevolucao == null (ainda não devolvidos).
    [HttpGet("em-aberto")]
    public async Task<ActionResult<IEnumerable<AluguelReadDto>>> GetEmAberto([FromQuery] int? clienteId)
    {
        var query = _context.Alugueis
            .Where(a => a.DataDevolucao == null)
            .Join(_context.Clientes, a => a.ClienteId, c => c.Id, (a, c) => new { a, c })
            .Join(_context.Veiculos, ac => ac.a.VeiculoId, v => v.Id, (ac, v) => new { ac.a, ac.c, v });

        if (clienteId.HasValue)
            query = query.Where(x => x.a.ClienteId == clienteId.Value);

        var resultado = await query
            .OrderBy(x => x.a.DataPrevistaDevolucao)
            .Select(x => new AluguelReadDto(
                x.a.Id, x.a.ClienteId, x.c.Nome, x.a.VeiculoId, x.v.Modelo, x.v.Placa,
                x.a.DataRetirada, x.a.DataPrevistaDevolucao, x.a.DataDevolucao,
                x.a.KmInicial, x.a.KmFinal, x.a.ValorDiaria, x.a.ValorTotal))
            .ToListAsync();

        return Ok(resultado);
    }

    // FILTRO 5 — GET api/alugueis/faturamento-por-periodo?dataInicio=&dataFim=
    // INNER JOIN (via Include/navegação) + GroupBy: soma o valor faturado por
    // cliente dentro de um período, considerando só aluguéis já finalizados.
    [HttpGet("faturamento-por-periodo")]
    public async Task<ActionResult<IEnumerable<object>>> GetFaturamentoPorPeriodo(
        [FromQuery] DateTime dataInicio, [FromQuery] DateTime dataFim)
    {
        if (dataFim < dataInicio)
            return BadRequest(new { message = "A data final não pode ser anterior à data inicial." });

        var resultado = await _context.Alugueis
            .Include(a => a.Cliente) // gera um INNER JOIN com Clientes, pois ClienteId é obrigatório
            .Where(a => a.DataDevolucao != null
                     && a.DataDevolucao >= dataInicio
                     && a.DataDevolucao <= dataFim)
            .GroupBy(a => new { a.ClienteId, a.Cliente.Nome })
            .OrderByDescending(g => g.Sum(a => a.ValorTotal))
            .Select(g => new
            {
                clienteId = g.Key.ClienteId,
                clienteNome = g.Key.Nome,
                quantidadeAlugueis = g.Count(),
                valorTotalFaturado = g.Sum(a => a.ValorTotal)
            })
            .ToListAsync();

        return Ok(resultado);
    }

    [HttpPost]
    public async Task<ActionResult<AluguelReadDto>> Create(AluguelCreateDto dto)
    {
        if (dto.DataPrevistaDevolucao <= dto.DataRetirada)
            return BadRequest(new { message = "A data prevista de devolução deve ser depois da data de retirada." });

        var cliente = await _context.Clientes.FindAsync(dto.ClienteId);
        if (cliente is null)
            return BadRequest(new { message = $"Cliente {dto.ClienteId} não existe." });

        var veiculo = await _context.Veiculos.FindAsync(dto.VeiculoId);
        if (veiculo is null)
            return BadRequest(new { message = $"Veículo {dto.VeiculoId} não existe." });

        if (veiculo.Status != StatusVeiculo.Disponivel)
            return BadRequest(new { message = $"O veículo {veiculo.Placa} não está disponível para locação (status atual: {veiculo.Status})." });

        var aluguel = new Aluguel
        {
            ClienteId = dto.ClienteId,
            VeiculoId = dto.VeiculoId,
            DataRetirada = dto.DataRetirada,
            DataPrevistaDevolucao = dto.DataPrevistaDevolucao,
            KmInicial = dto.KmInicial,
            ValorDiaria = dto.ValorDiaria
        };

        veiculo.Status = StatusVeiculo.Alugado;

        _context.Alugueis.Add(aluguel);
        await _context.SaveChangesAsync();

        var readDto = await QueryComNomes().FirstAsync(a => a.Id == aluguel.Id);
        return CreatedAtAction(nameof(GetById), new { id = aluguel.Id }, readDto);
    }

    // PATCH api/alugueis/5/devolucao — registra a devolução do veículo (regra da Etapa 1)
    [HttpPatch("{id:int}/devolucao")]
    public async Task<ActionResult<AluguelReadDto>> RegistrarDevolucao(int id, AluguelDevolucaoDto dto)
    {
        var aluguel = await _context.Alugueis.Include(a => a.Veiculo).FirstOrDefaultAsync(a => a.Id == id);
        if (aluguel is null)
            return NotFound(new { message = $"Aluguel {id} não encontrado." });

        if (aluguel.DataDevolucao is not null)
            return BadRequest(new { message = "Este aluguel já foi devolvido." });

        if (dto.KmFinal < aluguel.KmInicial)
            return BadRequest(new { message = $"A quilometragem final não pode ser menor que a inicial ({aluguel.KmInicial})." });

        if (dto.DataDevolucao < aluguel.DataRetirada)
            return BadRequest(new { message = "A data de devolução não pode ser anterior à data de retirada." });

        var dias = Math.Max(1, (dto.DataDevolucao.Date - aluguel.DataRetirada.Date).Days);

        aluguel.DataDevolucao = dto.DataDevolucao;
        aluguel.KmFinal = dto.KmFinal;
        aluguel.ValorTotal = dias * aluguel.ValorDiaria;

        aluguel.Veiculo.Quilometragem = dto.KmFinal;
        aluguel.Veiculo.Status = StatusVeiculo.Disponivel;

        await _context.SaveChangesAsync();

        var readDto = await QueryComNomes().FirstAsync(a => a.Id == aluguel.Id);
        return Ok(readDto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var aluguel = await _context.Alugueis.Include(a => a.Veiculo).FirstOrDefaultAsync(a => a.Id == id);
        if (aluguel is null)
            return NotFound(new { message = $"Aluguel {id} não encontrado." });

        // Se o aluguel ainda estava em aberto, o veículo volta a ficar disponível
        if (aluguel.DataDevolucao is null)
            aluguel.Veiculo.Status = StatusVeiculo.Disponivel;

        _context.Alugueis.Remove(aluguel);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private IQueryable<AluguelReadDto> QueryComNomes()
    {
        return _context.Alugueis
            .Include(a => a.Cliente)
            .Include(a => a.Veiculo)
            .Select(a => new AluguelReadDto(
                a.Id, a.ClienteId, a.Cliente.Nome, a.VeiculoId, a.Veiculo.Modelo, a.Veiculo.Placa,
                a.DataRetirada, a.DataPrevistaDevolucao, a.DataDevolucao,
                a.KmInicial, a.KmFinal, a.ValorDiaria, a.ValorTotal));
    }
}
