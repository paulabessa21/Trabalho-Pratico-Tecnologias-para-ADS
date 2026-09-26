using Locadora.Data;
using Locadora.Dtos;
using Locadora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Locadora.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VeiculosController : ControllerBase
{
    private readonly LocadoraDbContext _context;

    public VeiculosController(LocadoraDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VeiculoReadDto>>> GetAll()
    {
        var veiculos = await QueryComNomes().OrderBy(v => v.Modelo).ToListAsync();
        return Ok(veiculos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VeiculoReadDto>> GetById(int id)
    {
        var veiculo = await QueryComNomes().FirstOrDefaultAsync(v => v.Id == id);
        if (veiculo is null)
            return NotFound(new { message = $"Veículo {id} não encontrado." });

        return Ok(veiculo);
    }

    // FILTRO 1 — GET api/veiculos/disponiveis?categoriaId=&fabricanteId=
    // INNER JOIN explícito (query syntax) entre Veiculo, Fabricante e Categoria.
    // Os dois joins são obrigatórios (todo veículo tem fabricante e categoria),
    // por isso aqui faz sentido ser INNER, e não LEFT.
    [HttpGet("disponiveis")]
    public async Task<ActionResult<IEnumerable<VeiculoReadDto>>> GetDisponiveis(
        [FromQuery] int? categoriaId, [FromQuery] int? fabricanteId)
    {
        var query =
            from veiculo in _context.Veiculos
            join fabricante in _context.Fabricantes on veiculo.FabricanteId equals fabricante.Id
            join categoria in _context.Categorias on veiculo.CategoriaId equals categoria.Id
            where veiculo.Status == StatusVeiculo.Disponivel
            select new { veiculo, fabricante, categoria };

        if (categoriaId.HasValue)
            query = query.Where(x => x.veiculo.CategoriaId == categoriaId.Value);

        if (fabricanteId.HasValue)
            query = query.Where(x => x.veiculo.FabricanteId == fabricanteId.Value);

        var resultado = await query
            .OrderBy(x => x.veiculo.Modelo)
            .Select(x => new VeiculoReadDto(
                x.veiculo.Id, x.veiculo.Modelo, x.veiculo.AnoFabricacao, x.veiculo.Quilometragem,
                x.veiculo.Placa, x.veiculo.Status.ToString(),
                x.fabricante.Id, x.fabricante.Nome, x.categoria.Id, x.categoria.Nome))
            .ToListAsync();

        return Ok(resultado);
    }

    // FILTRO 2 — GET api/veiculos/com-total-alugueis
    // LEFT JOIN explícito (Veiculo x Aluguel), com GroupBy: mostra TODO veículo,
    // inclusive os que nunca foram alugados (por isso é LEFT, e não INNER),
    // junto com a contagem de quantas vezes cada um já foi alugado.
    [HttpGet("com-total-alugueis")]
    public async Task<ActionResult<IEnumerable<object>>> GetComTotalAlugueis()
    {
        var resultado =
            from veiculo in _context.Veiculos
            join aluguel in _context.Alugueis on veiculo.Id equals aluguel.VeiculoId into alugueisDoVeiculo
            from aluguel in alugueisDoVeiculo.DefaultIfEmpty() // <- LEFT JOIN
            group aluguel by new { veiculo.Id, veiculo.Modelo, veiculo.Placa } into g
            orderby g.Key.Modelo
            select new
            {
                veiculoId = g.Key.Id,
                modelo = g.Key.Modelo,
                placa = g.Key.Placa,
                totalAlugueis = g.Count(a => a != null)
            };

        return Ok(await resultado.ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<VeiculoReadDto>> Create(VeiculoCreateDto dto)
    {
        if (!await _context.Fabricantes.AnyAsync(f => f.Id == dto.FabricanteId))
            return BadRequest(new { message = $"Fabricante {dto.FabricanteId} não existe." });

        if (!await _context.Categorias.AnyAsync(c => c.Id == dto.CategoriaId))
            return BadRequest(new { message = $"Categoria {dto.CategoriaId} não existe." });

        var veiculo = new Veiculo
        {
            Modelo = dto.Modelo.Trim(),
            AnoFabricacao = dto.AnoFabricacao,
            Quilometragem = dto.Quilometragem,
            Placa = dto.Placa.Trim().ToUpperInvariant(),
            FabricanteId = dto.FabricanteId,
            CategoriaId = dto.CategoriaId,
            Status = StatusVeiculo.Disponivel
        };

        _context.Veiculos.Add(veiculo);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (PlacaEmUso(dto.Placa))
        {
            return Conflict(new { message = $"Já existe um veículo com a placa '{dto.Placa}'." });
        }

        var readDto = await QueryComNomes().FirstAsync(v => v.Id == veiculo.Id);
        return CreatedAtAction(nameof(GetById), new { id = veiculo.Id }, readDto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, VeiculoUpdateDto dto)
    {
        var veiculo = await _context.Veiculos.FindAsync(id);
        if (veiculo is null)
            return NotFound(new { message = $"Veículo {id} não encontrado." });

        if (!Enum.TryParse<StatusVeiculo>(dto.Status, ignoreCase: true, out var status))
            return BadRequest(new { message = "Status inválido. Use Disponivel, Alugado ou Manutencao." });

        if (!await _context.Fabricantes.AnyAsync(f => f.Id == dto.FabricanteId))
            return BadRequest(new { message = $"Fabricante {dto.FabricanteId} não existe." });

        if (!await _context.Categorias.AnyAsync(c => c.Id == dto.CategoriaId))
            return BadRequest(new { message = $"Categoria {dto.CategoriaId} não existe." });

        veiculo.Modelo = dto.Modelo.Trim();
        veiculo.AnoFabricacao = dto.AnoFabricacao;
        veiculo.Quilometragem = dto.Quilometragem;
        veiculo.Placa = dto.Placa.Trim().ToUpperInvariant();
        veiculo.FabricanteId = dto.FabricanteId;
        veiculo.CategoriaId = dto.CategoriaId;
        veiculo.Status = status;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (PlacaEmUso(dto.Placa, id))
        {
            return Conflict(new { message = $"Já existe um veículo com a placa '{dto.Placa}'." });
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var veiculo = await _context.Veiculos.FindAsync(id);
        if (veiculo is null)
            return NotFound(new { message = $"Veículo {id} não encontrado." });

        _context.Veiculos.Remove(veiculo);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Não é possível remover este veículo: existem aluguéis cadastrados com ele." });
        }

        return NoContent();
    }

    private IQueryable<VeiculoReadDto> QueryComNomes()
    {
        return _context.Veiculos
            .Include(v => v.Fabricante)
            .Include(v => v.Categoria)
            .Select(v => new VeiculoReadDto(
                v.Id, v.Modelo, v.AnoFabricacao, v.Quilometragem, v.Placa, v.Status.ToString(),
                v.FabricanteId, v.Fabricante.Nome, v.CategoriaId, v.Categoria.Nome));
    }

    private bool PlacaEmUso(string placa, int? ignorarId = null)
    {
        var placaNormalizada = placa.Trim().ToUpperInvariant();
        return _context.Veiculos.Any(v => v.Placa == placaNormalizada && v.Id != ignorarId);
    }
}
