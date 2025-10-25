import { Stepper, Step, StepLabel, Box } from '@mui/material';

const stepsDefault = ['Confirmed', 'Processing', 'Out for Delivery', 'Delivered'];

const statusToStep = {
  pending: 0,
  confirmed: 0,
  processing: 1,
  out_for_delivery: 2,
  delivered: 3
};

const OrderTracker = ({ status, steps = stepsDefault }) => {
  const activeStep = statusToStep[status] ?? 0;
  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default OrderTracker;
