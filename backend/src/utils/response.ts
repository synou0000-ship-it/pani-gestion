import { Response } from 'express';

export function successResponse(
  res: Response,
  data: unknown = null,
  message = 'Succès',
  code = 200
): Response {
  return res.status(code).json({
    success: true,
    message,
    data,
  });
}

export function errorResponse(
  res: Response,
  message = 'Une erreur est survenue',
  code = 500
): Response {
  return res.status(code).json({
    success: false,
    message,
    data: null,
  });
}

export function paginatedResponse(
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
  message = 'Succès'
): Response {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
