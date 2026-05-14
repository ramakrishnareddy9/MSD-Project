import Payout from '../models/Payout.model.js';

export const getMyPayouts = async (req, res) => {
  try {
    if (!req.user?.roles?.includes('farmer')) {
      return res.status(403).json({
        success: false,
        message: 'Only farmers can view payout records'
      });
    }

    const payouts = await Payout.find({ farmerId: req.user._id })
      .sort({ periodEnd: -1, createdAt: -1 });

    const summary = payouts.reduce((accumulator, payout) => {
      accumulator.grossAmount += Number(payout.grossAmount || 0);
      accumulator.commissionDeducted += Number(payout.commissionDeducted || 0);
      accumulator.netAmount += Number(payout.netAmount || 0);

      if (payout.status === 'pending') {
        accumulator.pendingAmount += Number(payout.netAmount || 0);
      } else if (payout.status === 'processed') {
        accumulator.processedAmount += Number(payout.netAmount || 0);
      }

      return accumulator;
    }, {
      grossAmount: 0,
      commissionDeducted: 0,
      netAmount: 0,
      pendingAmount: 0,
      processedAmount: 0
    });

    res.json({
      success: true,
      data: {
        payouts,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const processPayout = async (req, res) => {
  try {
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can process payouts'
      });
    }

    const { paymentReference } = req.body;
    if (!String(paymentReference || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'paymentReference is required'
      });
    }

    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: 'Payout not found'
      });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending payouts can be processed'
      });
    }

    await payout.markProcessed(String(paymentReference).trim());

    res.json({
      success: true,
      message: 'Payout processed successfully',
      data: { payout }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
