namespace Locadora.Models;

public class Categoria
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public decimal ValorDiariaBase { get; set; }

    // Navegação: 1 categoria -> N veículos
    public ICollection<Veiculo> Veiculos { get; set; } = new List<Veiculo>();
}
