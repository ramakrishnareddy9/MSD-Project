import { TextField as MuiTextField } from '@mui/material';

const Input = ({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  name,
  placeholder,
  error,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  multiline = false,
  rows = 1,
  InputProps,
  InputLabelProps,
  sx = {},
  ...props
}) => {
  return (
    <MuiTextField
      label={label}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      type={type}
      name={name}
      placeholder={placeholder}
      error={!!error}
      helperText={error?.message || helperText}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      InputProps={InputProps}
      InputLabelProps={InputLabelProps}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        },
        ...sx
      }}
      {...props}
    />
  );
};

export default Input;
