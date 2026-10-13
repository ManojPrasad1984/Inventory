using Microsoft.EntityFrameworkCore;
using InventoryBilling.Api.Models;

namespace InventoryBilling.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();

    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<VehicleStock> VehicleStocks => Set<VehicleStock>();

    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripLoadItem> TripLoadItems => Set<TripLoadItem>();
    public DbSet<TripReturnItem> TripReturnItems => Set<TripReturnItem>();

    public DbSet<Shop> Shops => Set<Shop>();
    public DbSet<ShopLedgerEntry> ShopLedgerEntries => Set<ShopLedgerEntry>();

    public DbSet<VehicleSale> VehicleSales => Set<VehicleSale>();
    public DbSet<VehicleSaleItem> VehicleSaleItems => Set<VehicleSaleItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ---- Users ----
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();

        // ---- Products ----
        modelBuilder.Entity<Product>().HasIndex(p => p.Sku);
        modelBuilder.Entity<Product>().HasIndex(p => p.BrandCategory);

        // ---- Suppliers / Purchases (GRN) ----
        modelBuilder.Entity<Purchase>().HasIndex(p => p.PurchaseNumber).IsUnique();
        modelBuilder.Entity<Purchase>()
            .HasOne(p => p.Supplier).WithMany().HasForeignKey(p => p.SupplierId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Purchase>()
            .HasMany(p => p.Items).WithOne(i => i.Purchase).HasForeignKey(i => i.PurchaseId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PurchaseItem>()
            .HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);

        // ---- Vehicles / VehicleStock ----
        modelBuilder.Entity<Vehicle>().HasIndex(v => v.VehicleNumber).IsUnique();
        modelBuilder.Entity<VehicleStock>().HasIndex(vs => new { vs.VehicleId, vs.ProductId }).IsUnique();
        modelBuilder.Entity<VehicleStock>()
            .HasOne(vs => vs.Vehicle).WithMany().HasForeignKey(vs => vs.VehicleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<VehicleStock>()
            .HasOne(vs => vs.Product).WithMany().HasForeignKey(vs => vs.ProductId).OnDelete(DeleteBehavior.Restrict);

        // ---- Trips ----
        modelBuilder.Entity<Trip>().HasIndex(t => t.TripNumber).IsUnique();
        modelBuilder.Entity<Trip>()
            .HasOne(t => t.Vehicle).WithMany().HasForeignKey(t => t.VehicleId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Trip>()
            .HasMany(t => t.LoadItems).WithOne(li => li.Trip).HasForeignKey(li => li.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Trip>()
            .HasMany(t => t.ReturnItems).WithOne(ri => ri.Trip).HasForeignKey(ri => ri.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TripLoadItem>()
            .HasOne(li => li.Product).WithMany().HasForeignKey(li => li.ProductId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<TripReturnItem>()
            .HasOne(ri => ri.Product).WithMany().HasForeignKey(ri => ri.ProductId).OnDelete(DeleteBehavior.Restrict);

        // ---- Shops / Ledger ----
        modelBuilder.Entity<ShopLedgerEntry>()
            .HasOne(l => l.Shop).WithMany().HasForeignKey(l => l.ShopId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ShopLedgerEntry>().HasIndex(l => new { l.ShopId, l.EntryDate });

        // ---- Vehicle Sales ----
        modelBuilder.Entity<VehicleSale>().HasIndex(s => s.InvoiceNumber).IsUnique();
        modelBuilder.Entity<VehicleSale>()
            .HasOne(s => s.Trip).WithMany().HasForeignKey(s => s.TripId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<VehicleSale>()
            .HasOne(s => s.Vehicle).WithMany().HasForeignKey(s => s.VehicleId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<VehicleSale>()
            .HasOne(s => s.Shop).WithMany().HasForeignKey(s => s.ShopId).OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<VehicleSale>()
            .HasMany(s => s.Items).WithOne(i => i.VehicleSale).HasForeignKey(i => i.VehicleSaleId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<VehicleSaleItem>()
            .HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);

        // Precision for every money column, found generically so new entities never need to repeat this
        foreach (var property in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetColumnType("decimal(18,2)");
        }
    }
}
