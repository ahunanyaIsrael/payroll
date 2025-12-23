// FundPayroll.tsx
import { useState } from "react";
import { usePayroll } from '../../hooks/usePayroll';
import "./FundPayroll.css"

const FundPayroll = () => {
    const { fundPayroll, isConnected } = usePayroll();
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isConnected) {
            setError("Please connect wallet first");
            return;
        }

        const adaAmount = parseFloat(amount);
        if (isNaN(adaAmount) || adaAmount <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        try {
            setLoading(true);
            setError("");
            const txHash = await fundPayroll(adaAmount);
            alert(`✅ Added ${adaAmount} ADA to payroll!\nTx: ${txHash}`);
            setAmount("");
        } catch (err: any) {
            setError(err.message || "Failed to fund payroll");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fund-payroll">
            <h2>Add Funds to Payroll</h2>
            <p className="description">
                Add ADA to the payroll contract to ensure employees can withdraw their salaries.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label>Amount (ADA)</label>
                    <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        disabled={loading}
                    />
                </div>

                {error && <div className="error">{error}</div>}

                <button type="submit" disabled={loading || !isConnected}>
                    {loading ? "Processing..." : "Add Funds"}
                </button>
            </form>
        </div>
    );
};

export default FundPayroll;