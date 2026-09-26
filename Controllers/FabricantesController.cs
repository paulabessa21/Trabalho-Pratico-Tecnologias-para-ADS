using Locadora.Data;
using Locadora.Dtos;
using Locadora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Locadora.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FabricantesController : ControllerBase
{
    private readonly LocadoraDbContext _context;

    public FabricantesController(LocadoraDbContext context)
    {
        _context = context;
    }

    // GET api/fabricantes
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FabricanteReadDto>>> GetAll()
    {
        var fabricantes = await _context.Fabricantes
            .OrderBy(f => f.Nome)
            .Select(f => new FabricanteReadDto(f.Id, f.Nome))
            .ToListAsync();

        return Ok(fabricantes);
    }

    // GET api/fabricantes/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<FabricanteReadDto>> GetById(int id)
    {
        var fabricante = await _context.Fabricantes.FindAsync(id);
        if (fabricante is null)
            return NotFound(new { message = $"Fabricante {id} não encontrado." });

        return Ok(new FabricanteReadDto(fabricante.Id, fabricante.Nome));
    }

    // POST api/fabricantes
    [HttpPost]
    public async Task<ActionResult<FabricanteReadDto>> Create(FabricanteCreateDto dto)
    {
        var fabricante = new Fabricante { Nome = dto.Nome.Trim() };

        _context.Fabricantes.Add(fabricante);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (JaExiste(dto.Nome))
        {
            return Conflict(new { message = $"Já existe um fabricante chamado '{dto.Nome}'." });
        }

        var readDto = new FabricanteReadDto(fabricante.Id, fabricante.Nome);
        return CreatedAtAction(nameof(GetById), new { id = fabricante.Id }, readDto);
    }

    // PUT api/fabricantes/5
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, FabricanteUpdateDto dto)
    {
        var fabricante = await _context.Fabricantes.FindAsync(id);
        if (fabricante is null)
            return NotFound(new { message = $"Fabricante {id} não encontrado." });

        fabricante.Nome = dto.Nome.Trim();

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (JaExiste(dto.Nome, id))
        {
            return Conflict(new { message = $"Já existe um fabricante chamado '{dto.Nome}'." });
        }

        return NoContent();
    }

    // DELETE api/fabricantes/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var fabricante = await _context.Fabricantes.FindAsync(id);
        if (fabricante is null)
            return NotFound(new { message = $"Fabricante {id} não encontrado." });

        _context.Fabricantes.Remove(fabricante);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // A FK Veiculo -> Fabricante é Restrict: o banco recusa a exclusão
            // se existir algum veículo desse fabricante.
            return Conflict(new { message = "Não é possível remover este fabricante: existem veículos cadastrados com ele." });
        }

        return NoContent();
    }

    private bool JaExiste(string nome, int? ignorarId = null)
    {
        return _context.Fabricantes.Any(f => f.Nome == nome.Trim() && f.Id != ignorarId);
    }
}
