using Locadora.Models;
using Microsoft.EntityFrameworkCore;

namespace Locadora.Data;

public class LocadoraDbContext : DbContext
{
    public LocadoraDbContext(DbContextOptions<LocadoraDbContext> options) : base(options) { }

    public DbSet<Fabricante> Fabricantes => Set<Fabricante>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Veiculo> Veiculos => Set<Veiculo>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Aluguel> Alugueis => Set<Aluguel>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ---------- Fabricante ----------
        modelBuilder.Entity<Fabricante>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nome).IsRequired().HasMaxLength(100);
            e.HasIndex(x => x.Nome).IsUnique();
        });

        // ---------- Categoria ----------
        modelBuilder.Entity<Categoria>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nome).IsRequired().HasMaxLength(50);
            e.Property(x => x.ValorDiariaBase).HasColumnType("decimal(10,2)");
            e.HasIndex(x => x.Nome).IsUnique();
            e.ToTable(t => t.HasCheckConstraint("CK_Categoria_ValorDiariaBase", "[ValorDiariaBase] > 0"));
        });

        // ---------- Veículo ----------
        modelBuilder.Entity<Veiculo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Modelo).IsRequired().HasMaxLength(100);
            e.Property(x => x.Placa).IsRequired().HasMaxLength(8);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.Placa).IsUnique();

            e.HasOne(x => x.Fabricante)
             .WithMany(f => f.Veiculos)
             .HasForeignKey(x => x.FabricanteId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Categoria)
             .WithMany(c => c.Veiculos)
             .HasForeignKey(x => x.CategoriaId)
             .OnDelete(DeleteBehavior.Restrict);

            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Veiculo_Quilometragem", "[Quilometragem] >= 0");
                t.HasCheckConstraint("CK_Veiculo_AnoFabricacao", "[AnoFabricacao] >= 1900");
            });
        });

        // ---------- Cliente ----------
        modelBuilder.Entity<Cliente>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nome).IsRequired().HasMaxLength(150);
            e.Property(x => x.Cpf).IsRequired().HasMaxLength(11).IsFixedLength();
            e.Property(x => x.Email).IsRequired().HasMaxLength(150);
            e.Property(x => x.Telefone).HasMaxLength(20);
            e.HasIndex(x => x.Cpf).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
        });

        // ---------- Aluguel ----------
        modelBuilder.Entity<Aluguel>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ValorDiaria).HasColumnType("decimal(10,2)");
            e.Property(x => x.ValorTotal).HasColumnType("decimal(10,2)");

            e.HasOne(x => x.Cliente)
             .WithMany(c => c.Alugueis)
             .HasForeignKey(x => x.ClienteId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.Veiculo)
             .WithMany(v => v.Alugueis)
             .HasForeignKey(x => x.VeiculoId)
             .OnDelete(DeleteBehavior.Restrict);

            e.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Aluguel_ValorDiaria", "[ValorDiaria] > 0");
                t.HasCheckConstraint("CK_Aluguel_KmFinal", "[KmFinal] IS NULL OR [KmFinal] >= [KmInicial]");
                t.HasCheckConstraint("CK_Aluguel_PrevistaDevolucao", "[DataPrevistaDevolucao] >= [DataRetirada]");
                t.HasCheckConstraint("CK_Aluguel_DataDevolucao", "[DataDevolucao] IS NULL OR [DataDevolucao] >= [DataRetirada]");
            });
        });
    }
}
