namespace Locadora.Models;

public class Fabricante
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;

    // Navegação: 1 fabricante -> N veículos
    public ICollection<Veiculo> Veiculos { get; set; } = new List<Veiculo>();
}
