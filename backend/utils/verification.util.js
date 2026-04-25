const HIGH_VALUE_ORDER_THRESHOLD = Number(process.env.HIGH_VALUE_ORDER_THRESHOLD || 10000);

const isHighValueTransaction = (amount, orderType) => {
  return Number(amount || 0) >= HIGH_VALUE_ORDER_THRESHOLD || orderType === 'b2b';
};

export const getTransactionVerificationThreshold = () => HIGH_VALUE_ORDER_THRESHOLD;

export const assertTransactionVerification = (user, amount, orderType = 'b2c') => {
  if (!user) {
    return { ok: false, message: 'Authentication required' };
  }

  if (user.roles?.includes('admin')) {
    return { ok: true };
  }

  if (!user.emailVerified) {
    return { ok: false, message: 'Email verification is required before placing orders or payments' };
  }

  if (!user.phoneVerified) {
    return { ok: false, message: 'Phone verification is required before placing orders or payments' };
  }

  if (isHighValueTransaction(amount, orderType) && user.kycStatus !== 'verified') {
    return {
      ok: false,
      message: `KYC verification is required for orders and payments at or above ₹${HIGH_VALUE_ORDER_THRESHOLD.toLocaleString('en-IN')}`
    };
  }

  return { ok: true };
};