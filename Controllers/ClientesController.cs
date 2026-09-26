using Locadora.Data;
using Locadora.Dtos;
using Locadora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Locadora.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientesController : ControllerBase
{
    private readonly LocadoraDbContext _context;

    public ClientesController(LocadoraDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClienteReadDto>>> GetAll()
    {
        var clientes = await _context.Clientes
            .OrderBy(c => c.Nome)
            .Select(c => new ClienteReadDto(c.Id, c.Nome, c.Cpf, c.Email, c.Telefone))
            .ToListAsync();

        return Ok(clientes);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ClienteReadDto>> GetById(int id)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        if (cliente is null)
            return NotFound(new { message = $"Cliente {id} não encontrado." });

        return Ok(new ClienteReadDto(cliente.Id, cliente.Nome, cliente.Cpf, cliente.Email, cliente.Telefone));
    }

    // FILTRO 4 — GET api/clientes/sem-aluguel
    // LEFT JOIN explícito (Cliente x Aluguel) usando "join ... into ... DefaultIfEmpty()":
    // traz todo cliente, mesmo quem nunca tenha um aluguel associado, e filtra
    // apenas quem ficou com o lado do Aluguel vazio (nunca alugou).
    [HttpGet("sem-aluguel")]
    public async Task<ActionResult<IEnumerable<ClienteReadDto>>> GetSemAluguel()
    {
        var clientesSemAluguel =
            from cliente in _context.Clientes
            join aluguel in _context.Alugueis on cliente.Id equals aluguel.ClienteId into alugueisDoCliente
            from aluguel in alugueisDoCliente.DefaultIfEmpty() // <- transforma o INNER em LEFT JOIN
            where aluguel == null
            orderby cliente.Nome
            select new ClienteReadDto(cliente.Id, cliente.Nome, cliente.Cpf, cliente.Email, cliente.Telefone);

        return Ok(await clientesSemAluguel.ToListAsync());
    }

    [HttpPost]
    public async Task<ActionResult<ClienteReadDto>> Create(ClienteCreateDto dto)
    {
        var cliente = new Cliente
        {
            Nome = dto.Nome.Trim(),
            Cpf = dto.Cpf.Trim(),
            Email = dto.Email.Trim(),
            Telefone = dto.Telefone?.Trim()
        };

        _context.Clientes.Add(cliente);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (CpfOuEmailEmUso(dto.Cpf, dto.Email, out var mensagem))
        {
            return Conflict(new { message = mensagem });
        }

        var readDto = new ClienteReadDto(cliente.Id, cliente.Nome, cliente.Cpf, cliente.Email, cliente.Telefone);
        return CreatedAtAction(nameof(GetById), new { id = cliente.Id }, readDto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ClienteUpdateDto dto)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        if (cliente is null)
            return NotFound(new { message = $"Cliente {id} não encontrado." });

        cliente.Nome = dto.Nome.Trim();
        cliente.Cpf = dto.Cpf.Trim();
        cliente.Email = dto.Email.Trim();
        cliente.Telefone = dto.Telefone?.Trim();

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (CpfOuEmailEmUso(dto.Cpf, dto.Email, out var mensagem, id))
        {
            return Conflict(new { message = mensagem });
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        if (cliente is null)
            return NotFound(new { message = $"Cliente {id} não encontrado." });

        _context.Clientes.Remove(cliente);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Não é possível remover este cliente: existem aluguéis cadastrados com ele." });
        }

        return NoContent();
    }

    private bool CpfOuEmailEmUso(string cpf, string email, out string mensagem, int? ignorarId = null)
    {
        var cpfEmUso = _context.Clientes.Any(c => c.Cpf == cpf.Trim() && c.Id != ignorarId);
        var emailEmUso = _context.Clientes.Any(c => c.Email == email.Trim() && c.Id != ignorarId);

        mensagem = (cpfEmUso, emailEmUso) switch
        {
            (true, true) => "Já existe um cliente com este CPF e este e-mail.",
            (true, false) => "Já existe um cliente com este CPF.",
            (false, true) => "Já existe um cliente com este e-mail.",
            _ => string.Empty
        };

        return cpfEmUso || emailEmUso;
    }
}
