using System.ComponentModel.DataAnnotations;

namespace Locadora.Dtos;

// DTO de leitura: o que a API devolve para o cliente da API
public record FabricanteReadDto(int Id, string Nome);

// DTO de entrada: o que a API aceita receber (nunca expomos a entidade do EF direto)
public class FabricanteCreateDto
{
    [Required(ErrorMessage = "O nome do fabricante é obrigatório.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "O nome deve ter entre 2 e 100 caracteres.")]
    public string Nome { get; set; } = string.Empty;
}

public class FabricanteUpdateDto : FabricanteCreateDto
{
}
