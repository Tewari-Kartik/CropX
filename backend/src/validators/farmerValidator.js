import Joi from 'joi';

export const createFarmerSchema = Joi.object({
  full_name: Joi.string().min(2).max(255).required(),
  phone_number: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/).required(),
  preferred_language: Joi.string().valid('en', 'hi').default('en'),
  region: Joi.object({
    village_name: Joi.string().required(),
    district: Joi.string().required(),
    state: Joi.string().required(),
  }).required(),
  land_size_acres: Joi.number().positive().optional(),
  crops: Joi.array().items(
    Joi.object({
      crop_name: Joi.string().required(),
      sowing_date: Joi.date().iso().optional(),
      irrigation_type: Joi.string().optional(),
    })
  ).optional(),
});

export const distressScoreSchema = Joi.object({
  force_recompute: Joi.boolean().default(false),
});
