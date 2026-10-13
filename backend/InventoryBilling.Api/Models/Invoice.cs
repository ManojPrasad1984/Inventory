using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InventoryBilling.Api.Models;

public enum PaymentStatus
{
    Paid,
    Partial,
    Unpaid
}

public enum PaymentMethod
{
    Cash,
    Card,
    UPI,
    BankTransfer,
    Credit
}

public class Invoice
{
    public int Id { get; set; }

    [Required, MaxLength(30)]
    public string InvoiceNumber { get; set; } = string.Empty;

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    [MaxLength(200)]
    public string? WalkInCustomerName { get; set; } // used when CustomerId is null

    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;

    public List<InvoiceItem> Items { get; set; } = new();

    public decimal SubTotal { get; set; }

    public decimal TaxAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal AmountPaid { get; set; }

    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Paid;

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class InvoiceItem
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }
    [ForeignKey(nameof(InvoiceId))]
    public Invoice? Invoice { get; set; }

    public int ProductId { get; set; }
    public Product? Product { get; set; }

    [MaxLength(200)]
    public string ProductName { get; set; } = string.Empty; // snapshot at time of sale

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; } // snapshot at time of sale

    public decimal TaxPercent { get; set; }

    public decimal LineTotal { get; set; }
}
