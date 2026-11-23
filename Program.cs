using Locadora.Data;
using Locadora.Middleware;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Controllers + validação automática dos DataAnnotations dos DTOs
builder.Services.AddControllers();

// CORS: permite que o front-end (pasta Frontend/), aberto em outro endereço/porta,
// chame esta API pelo navegador usando fetch (Trabalho Prático 2)
builder.Services.AddCors(options =>
    options.AddPolicy("Frontend", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

// Banco de dados (SQL Server Express), via Entity Framework
builder.Services.AddDbContext<LocadoraDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Locadora")));

// Swagger / OpenAPI, para testar a API pelo navegador (item 2.1)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Locadora de Veículos - API",
        Version = "v1",
        Description = "API RESTful do trabalho prático de Tecnologias para ADS"
    });
});

var app = builder.Build();

// Middleware global de tratamento de exceções (item 2.4) — fica no topo do
// pipeline para capturar erros de qualquer parte do processamento da requisição
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Locadora API v1");
    c.RoutePrefix = string.Empty; // Swagger abre direto na raiz: https://localhost:xxxx/
});

// Em desenvolvimento o front chama a API por http://localhost:5202; o redirecionamento
// para https quebraria o fetch (CORS), então ele só vale fora do ambiente de desenvolvimento
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseCors("Frontend");
app.UseAuthorization();
app.MapControllers();

app.Run();
