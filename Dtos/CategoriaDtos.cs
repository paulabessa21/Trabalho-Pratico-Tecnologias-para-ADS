using System.ComponentModel.DataAnnotations;

namespace Locadora.Dtos;

public record CategoriaReadDto(int Id, string Nome, decimal ValorDiariaBase);

public class CategoriaCreateDto
{
    [Required(ErrorMessage = "O nome da categoria é obrigatório.")]
    [StringLength(50, MinimumLength = 2)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O valor da diária base é obrigatório.")]
    [Range(0.01, 100000, ErrorMessage = "O valor da diária deve ser maior que zero.")]
    public decimal ValorDiariaBase { get; set; }
}

public class CategoriaUpdateDto : CategoriaCreateDto
{
}
