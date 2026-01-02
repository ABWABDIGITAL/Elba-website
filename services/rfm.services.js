// services/rfm.service.js

import User from "../models/user.model.js";
import Order from "../models/order.model.js";

/**
 * RFM (Recency, Frequency, Monetary) Scoring
 * Score 1-5 for each dimension, 5 being best
 */
export const calculateRFMScores = async () => {
  const now = new Date();
  
  // Get all customers with orders
  const customers = await Order.aggregate([
    {
      $match: {
        status: { $nin: ['cancelled', 'refunded'] }
      }
    },
    {
      $group: {
        _id: '$user',
        recency: { $max: '$createdAt' },
        frequency: { $sum: 1 },
        monetary: { $sum: '$totalAmount' }
      }
    },
    {
      $addFields: {
        recencyDays: {
          $divide: [
            { $subtract: [now, '$recency'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    }
  ]);

  if (customers.length === 0) return [];

  // Calculate percentiles for scoring
  const recencyValues = customers.map(c => c.recencyDays).sort((a, b) => a - b);
  const frequencyValues = customers.map(c => c.frequency).sort((a, b) => a - b);
  const monetaryValues = customers.map(c => c.monetary).sort((a, b) => a - b);

  const getPercentile = (arr, p) => arr[Math.floor(arr.length * p / 100)];

  const recencyBuckets = [
    getPercentile(recencyValues, 20),
    getPercentile(recencyValues, 40),
    getPercentile(recencyValues, 60),
    getPercentile(recencyValues, 80)
  ];

  const frequencyBuckets = [
    getPercentile(frequencyValues, 20),
    getPercentile(frequencyValues, 40),
    getPercentile(frequencyValues, 60),
    getPercentile(frequencyValues, 80)
  ];

  const monetaryBuckets = [
    getPercentile(monetaryValues, 20),
    getPercentile(monetaryValues, 40),
    getPercentile(monetaryValues, 60),
    getPercentile(monetaryValues, 80)
  ];

  // Score each customer
  const scoredCustomers = customers.map(customer => {
    // Recency: Lower is better (inverted scoring)
    let rScore = 1;
    if (customer.recencyDays <= recencyBuckets[0]) rScore = 5;
    else if (customer.recencyDays <= recencyBuckets[1]) rScore = 4;
    else if (customer.recencyDays <= recencyBuckets[2]) rScore = 3;
    else if (customer.recencyDays <= recencyBuckets[3]) rScore = 2;

    // Frequency: Higher is better
    let fScore = 1;
    if (customer.frequency >= frequencyBuckets[3]) fScore = 5;
    else if (customer.frequency >= frequencyBuckets[2]) fScore = 4;
    else if (customer.frequency >= frequencyBuckets[1]) fScore = 3;
    else if (customer.frequency >= frequencyBuckets[0]) fScore = 2;

    // Monetary: Higher is better
    let mScore = 1;
    if (customer.monetary >= monetaryBuckets[3]) mScore = 5;
    else if (customer.monetary >= monetaryBuckets[2]) mScore = 4;
    else if (customer.monetary >= monetaryBuckets[1]) mScore = 3;
    else if (customer.monetary >= monetaryBuckets[0]) mScore = 2;

    const rfmScore = rScore * 100 + fScore * 10 + mScore;
    const avgScore = (rScore + fScore + mScore) / 3;

    // Determine segment based on RFM
    let segment = 'other';
    if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'champions';
    else if (rScore >= 4 && fScore >= 3 && mScore >= 3) segment = 'loyal_customers';
    else if (rScore >= 3 && fScore >= 1 && mScore >= 3) segment = 'potential_loyalists';
    else if (rScore >= 4 && fScore === 1) segment = 'new_customers';
    else if (rScore >= 3 && fScore >= 3 && mScore <= 2) segment = 'promising';
    else if (rScore <= 2 && fScore >= 3 && mScore >= 3) segment = 'at_risk';
    else if (rScore <= 2 && fScore >= 4 && mScore >= 4) segment = 'cant_lose';
    else if (rScore <= 2 && fScore <= 2 && mScore <= 2) segment = 'hibernating';
    else if (rScore <= 1 && fScore <= 1) segment = 'lost';

    return {
      userId: customer._id,
      recencyDays: Math.round(customer.recencyDays),
      frequency: customer.frequency,
      monetary: Math.round(customer.monetary),
      rScore,
      fScore,
      mScore,
      rfmScore,
      avgScore: avgScore.toFixed(2),
      segment
    };
  });

  return scoredCustomers;
};

/**
 * RFM Segments Definition
 */
export const RFM_SEGMENTS = {
  champions: {
    name: 'Champions',
    description: 'Best customers. Bought recently, buy often, spend the most',
    action: 'Reward them. They can become evangelists and early adopters for new products',
    rfmPattern: 'R:4-5, F:4-5, M:4-5'
  },
  loyal_customers: {
    name: 'Loyal Customers',
    description: 'Spend good money. Responsive to promotions',
    action: 'Upsell higher value products. Ask for reviews',
    rfmPattern: 'R:4-5, F:3-5, M:3-5'
  },
  potential_loyalists: {
    name: 'Potential Loyalists',
    description: 'Recent customers with average frequency',
    action: 'Offer membership/loyalty program, recommend related products',
    rfmPattern: 'R:3-5, F:1-3, M:3-5'
  },
  new_customers: {
    name: 'New Customers',
    description: 'Bought most recently, but not often',
    action: 'Provide onboarding support, give early success, start building relationship',
    rfmPattern: 'R:4-5, F:1, M:any'
  },
  promising: {
    name: 'Promising',
    description: 'Recent shoppers, but havent spent much',
    action: 'Create brand awareness, offer free trials',
    rfmPattern: 'R:3-4, F:3-4, M:1-2'
  },
  at_risk: {
    name: 'At Risk',
    description: 'Spent big money, purchased often but long time ago',
    action: 'Send personalized reactivation campaigns, offer renewals',
    rfmPattern: 'R:1-2, F:3-5, M:3-5'
  },
  cant_lose: {
    name: "Can't Lose Them",
    description: 'Made biggest purchases and often, but havent returned recently',
    action: 'Win them back via renewals or newer products, dont lose them to competition',
    rfmPattern: 'R:1-2, F:4-5, M:4-5'
  },
  hibernating: {
    name: 'Hibernating',
    description: 'Last purchase was long ago, low spenders, low frequency',
    action: 'Offer other relevant products and special discounts. Recreate brand value',
    rfmPattern: 'R:1-2, F:1-2, M:1-2'
  },
  lost: {
    name: 'Lost',
    description: 'Lowest recency, frequency, and monetary scores',
    action: 'Revive interest with reach out campaign, ignore otherwise',
    rfmPattern: 'R:1, F:1, M:any'
  }
};