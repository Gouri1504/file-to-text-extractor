// utils/ApiResponse.js
// Standard success-envelope so the frontend can rely on a consistent shape:
//   { success: true, message, data }
// Error responses use the same envelope with success:false (built by the
// error middleware), so client code never has to guess where the payload is.

class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

export default ApiResponse;
