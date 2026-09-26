using Locadora.Data;
using Locadora.Dtos;
using Locadora.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Locadora.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriasController : ControllerBase
{
    private readonly LocadoraDbContext _context;

    public CategoriasController(LocadoraDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoriaReadDto>>> GetAll()
    {
        var categorias = await _context.Categorias
            .OrderBy(c => c.Nome)
            .Select(c => new CategoriaReadDto(c.Id, c.Nome, c.ValorDiariaBase))
            .ToListAsync();

        return Ok(categorias);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CategoriaReadDto>> GetById(int id)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
            return NotFound(new { message = $"Categoria {id} não encontrada." });

        return Ok(new CategoriaReadDto(categoria.Id, categoria.Nome, categoria.ValorDiariaBase));
    }

    [HttpPost]
    public async Task<ActionResult<CategoriaReadDto>> Create(CategoriaCreateDto dto)
    {
        var categoria = new Categoria { Nome = dto.Nome.Trim(), ValorDiariaBase = dto.ValorDiariaBase };
        _context.Categorias.Add(categoria);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (JaExiste(dto.Nome))
        {
            return Conflict(new { message = $"Já existe uma categoria chamada '{dto.Nome}'." });
        }

        var readDto = new CategoriaReadDto(categoria.Id, categoria.Nome, categoria.ValorDiariaBase);
        return CreatedAtAction(nameof(GetById), new { id = categoria.Id }, readDto);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, CategoriaUpdateDto dto)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
            return NotFound(new { message = $"Categoria {id} não encontrada." });

        categoria.Nome = dto.Nome.Trim();
        categoria.ValorDiariaBase = dto.ValorDiariaBase;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException) when (JaExiste(dto.Nome, id))
        {
            return Conflict(new { message = $"Já existe uma categoria chamada '{dto.Nome}'." });
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var categoria = await _context.Categorias.FindAsync(id);
        if (categoria is null)
            return NotFound(new { message = $"Categoria {id} não encontrada." });

        _context.Categorias.Remove(categoria);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Não é possível remover esta categoria: existem veículos cadastrados com ela." });
        }

        return NoContent();
    }

    private bool JaExiste(string nome, int? ignorarId = null)
    {
        return _context.Categorias.Any(c => c.Nome == nome.Trim() && c.Id != ignorarId);
    }
}
