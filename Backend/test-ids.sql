-- ============================================================================
-- Sample IDs for Testing the Full Flow
-- ============================================================================
-- Run this in your PostgreSQL client (pgAdmin, psql, DBeaver, etc.)
-- Copy the results and use them in your API requests

-- 1. Get a sample customer ID
SELECT id, name, email, city 
FROM customers 
LIMIT 5;

-- 2. Get a sample segment ID with audience count
SELECT 
  s.id,
  s.name,
  COUNT(DISTINCT c.id) as audience_size
FROM segments s
LEFT JOIN customers c ON TRUE  -- will need actual evaluation
GROUP BY s.id, s.name
LIMIT 5;

-- 3. Get existing campaign IDs
SELECT 
  id, 
  name, 
  channel, 
  status, 
  message,
  audience_id
FROM campaigns
LIMIT 5;

-- 4. Get a communication ID (for testing webhooks)
SELECT 
  c.id as communication_id,
  c.campaign_id,
  c.customer_id,
  c.channel,
  c.status,
  camp.name as campaign_name
FROM communications c
JOIN campaigns camp ON c.campaign_id = camp.id
LIMIT 5;

-- ============================================================================
-- Quick reference query - Copy these IDs for Postman
-- ============================================================================
SELECT 
  'Customer ID' as type,
  id as value,
  name as description
FROM customers
LIMIT 1

UNION ALL

SELECT 
  'Segment ID' as type,
  id as value,
  name as description
FROM segments
WHERE name = 'VIP Customers'
LIMIT 1

UNION ALL

SELECT 
  'Campaign ID' as type,
  id as value,
  name as description
FROM campaigns
WHERE status = 'COMPLETED'
LIMIT 1

UNION ALL

SELECT 
  'Communication ID' as type,
  id as value,
  CONCAT('Campaign: ', campaign_id) as description
FROM communications
LIMIT 1;
