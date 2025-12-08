import {
    createInvoiceService,
    checkPaymentStatusService
} from "../services/myfatoorah.services.js";

export const createPayment = async (req, res) => {
    try {
        const result = await createInvoiceService(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const result = await checkPaymentStatusService(req.params.invoiceId);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });
    }
};
