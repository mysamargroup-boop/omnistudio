from dataclasses import dataclass

USD_TO_INR = 83.50

@dataclass(frozen=True)
class Money:
    amount: float
    currency: str = "USD"

    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Money cannot be negative")
        if self.currency not in ("USD", "INR"):
            raise ValueError(f"Unsupported currency: {self.currency}")

    def convert_to(self, target_currency: str) -> "Money":
        if self.currency == target_currency:
            return self
        if self.currency == "USD" and target_currency == "INR":
            return Money(self.amount * USD_TO_INR, "INR")
        return Money(self.amount / USD_TO_INR, "USD")

    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            converted = other.convert_to(self.currency)
            return Money(self.amount + converted.amount, self.currency)
        return Money(self.amount + other.amount, self.currency)
