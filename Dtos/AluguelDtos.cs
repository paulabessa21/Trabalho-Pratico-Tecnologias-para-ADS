using System.ComponentModel.DataAnnotations;

namespace Locadora.Dtos;

public record AluguelReadDto(
    int Id,
    int ClienteId,
    string ClienteNome,
    int VeiculoId,
    string VeiculoModelo,
    string VeiculoPlaca,
    DateTime DataRetirada,
    DateTime DataPrevistaDevolucao,
    DateTime? DataDevolucao,
    int KmInicial,
    int? KmFinal,
    decimal ValorDiaria,
    decimal? ValorTotal);

public class AluguelCreateDto
{
    [Required(ErrorMessage = "Informe o cliente.")]
    public int ClienteId { get; set; }

    [Required(ErrorMessage = "Informe o veículo.")]
    public int VeiculoId { get; set; }

    [Required(ErrorMessage = "Informe a data de retirada.")]
    public DateTime DataRetirada { get; set; }

    [Required(ErrorMessage = "Informe a data prevista de devolução.")]
    public DateTime DataPrevistaDevolucao { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "A quilometragem inicial não pode ser negativa.")]
    public int KmInicial { get; set; }

    [Required(ErrorMessage = "Informe o valor da diária.")]
    [Range(0.01, 100000, ErrorMessage = "O valor da diária deve ser maior que zero.")]
    public decimal ValorDiaria { get; set; }
}

// DTO usado só para registrar a devolução do veículo (item 2.4 / regra da Etapa 1)
public class AluguelDevolucaoDto
{
    [Required(ErrorMessage = "Informe a data de devolução.")]
    public DateTime DataDevolucao { get; set; }

    [Required(ErrorMessage = "Informe a quilometragem final.")]
    [Range(0, int.MaxValue)]
    public int KmFinal { get; set; }
}
