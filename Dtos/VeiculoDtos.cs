using System.ComponentModel.DataAnnotations;

namespace Locadora.Dtos;

// DTO de leitura: já traz o nome do fabricante e da categoria,
// para o front-end não precisar fazer uma segunda chamada
public record VeiculoReadDto(
    int Id,
    string Modelo,
    int AnoFabricacao,
    int Quilometragem,
    string Placa,
    string Status,
    int FabricanteId,
    string FabricanteNome,
    int CategoriaId,
    string CategoriaNome);

public class VeiculoCreateDto
{
    [Required(ErrorMessage = "O modelo é obrigatório.")]
    [StringLength(100, MinimumLength = 2)]
    public string Modelo { get; set; } = string.Empty;

    [Required(ErrorMessage = "O ano de fabricação é obrigatório.")]
    [Range(1950, 2100, ErrorMessage = "Ano de fabricação inválido.")]
    public int AnoFabricacao { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "A quilometragem não pode ser negativa.")]
    public int Quilometragem { get; set; }

    [Required(ErrorMessage = "A placa é obrigatória.")]
    [StringLength(8, MinimumLength = 7, ErrorMessage = "Informe a placa no formato antigo (AAA1234) ou Mercosul (AAA1A23).")]
    public string Placa { get; set; } = string.Empty;

    [Required(ErrorMessage = "Informe o fabricante do veículo.")]
    public int FabricanteId { get; set; }

    [Required(ErrorMessage = "Informe a categoria do veículo.")]
    public int CategoriaId { get; set; }
}

public class VeiculoUpdateDto : VeiculoCreateDto
{
    // Disponivel, Alugado ou Manutencao
    [Required(ErrorMessage = "Informe o status do veículo.")]
    public string Status { get; set; } = string.Empty;
}
