// middleware/validate.middleware.js
// Generic Zod runner. Each route declares a schema for { body, params, query }
// and we validate before the handler runs - controllers can then trust their
// inputs. Failed validation produces a 400 with structured field errors so
// the frontend can highlight specific inputs.

import ApiError from '../utils/ApiError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return next(new ApiError(400, 'Validation failed', result.error.flatten().fieldErrors));
  }

  // Replace request slices with the parsed/coerced versions (e.g. number
  // strings -> numbers) so handlers see typed data.
  if (result.data.body) req.body = result.data.body;
  if (result.data.params) req.params = result.data.params;
  if (result.data.query) req.query = result.data.query;
  next();
};
