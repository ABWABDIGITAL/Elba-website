import {
  embedProduct,
  syncEmbeddings,
  forceSyncAll,
  getEmbeddingStatus,
} from "../services/embeddings.services.js";

// GET /api/v1/embeddings/status
export const statusController = async (req, res, next) => {
  try {
    const status = await getEmbeddingStatus();
    res.json({
      status: "success",
      message: "Embedding status",
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/embeddings/sync-all
export const syncAllController = async (req, res, next) => {
  try {
    const result = await syncEmbeddings();
    res.json({
      status: "success",
      message: `Synced ${result.embedded} of ${result.total} products`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/embeddings/products/:productId
export const embedSingleController = async (req, res, next) => {
  try {
    const result = await embedProduct(req.params.productId);
    res.json({
      status: "success",
      message: "Product embedded successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/embeddings/force-sync
export const forceSyncController = async (req, res, next) => {
  try {
    const result = await forceSyncAll();
    res.json({
      status: "success",
      message: `Force synced ${result.embedded} of ${result.total} products`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
