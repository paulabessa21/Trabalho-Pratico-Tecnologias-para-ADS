namespace Locadora.Models;

public class Veiculo
{
    public int Id { get; set; }
    public string Modelo { get; set; } = string.Empty;
    public int AnoFabricacao { get; set; }
    public int Quilometragem { get; set; }
    public string Placa { get; set; } = string.Empty;
    public StatusVeiculo Status { get; set; } = StatusVeiculo.Disponivel;

    // Chaves estrangeiras
    public int FabricanteId { get; set; }
    public int CategoriaId { get; set; }

    // Navegações
    public Fabricante Fabricante { get; set; } = null!;
    public Categoria Categoria { get; set; } = null!;
    public ICollection<Aluguel> Alugueis { get; set; } = new List<Aluguel>();
}
