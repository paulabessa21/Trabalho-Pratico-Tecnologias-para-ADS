namespace Locadora.Models;

public class Aluguel
{
    public int Id { get; set; }

    // Chaves estrangeiras
    public int ClienteId { get; set; }
    public int VeiculoId { get; set; }

    // Período
    public DateTime DataRetirada { get; set; }
    public DateTime DataPrevistaDevolucao { get; set; }
    public DateTime? DataDevolucao { get; set; }   // nulo até o veículo ser devolvido

    // Quilometragem
    public int KmInicial { get; set; }
    public int? KmFinal { get; set; }              // nulo até a devolução

    // Valores
    public decimal ValorDiaria { get; set; }
    public decimal? ValorTotal { get; set; }       // calculado na devolução

    // Navegações
    public Cliente Cliente { get; set; } = null!;
    public Veiculo Veiculo { get; set; } = null!;
}
