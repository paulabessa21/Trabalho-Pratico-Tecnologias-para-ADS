using System.ComponentModel.DataAnnotations;

namespace Locadora.Dtos;

public record ClienteReadDto(int Id, string Nome, string Cpf, string Email, string? Telefone);

public class ClienteCreateDto
{
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(150, MinimumLength = 3)]
    public string Nome { get; set; } = string.Empty;

    [Required(ErrorMessage = "O CPF é obrigatório.")]
    [RegularExpression(@"^\d{11}$", ErrorMessage = "O CPF deve conter exatamente 11 dígitos, sem pontos ou traço.")]
    public string Cpf { get; set; } = string.Empty;

    [Required(ErrorMessage = "O e-mail é obrigatório.")]
    [EmailAddress(ErrorMessage = "E-mail em formato inválido.")]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [StringLength(20)]
    public string? Telefone { get; set; }
}

public class ClienteUpdateDto : ClienteCreateDto
{
}
