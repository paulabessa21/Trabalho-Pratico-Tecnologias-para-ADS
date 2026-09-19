namespace Locadora.Models;

public class Cliente
{
    public int Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefone { get; set; }

    // Navegação: 1 cliente -> N aluguéis
    public ICollection<Aluguel> Alugueis { get; set; } = new List<Aluguel>();
}
