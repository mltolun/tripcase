-- Backfill existing flights where local departure/arrival times were stored as
-- if they were UTC (TIMESTAMPTZ interprets bare ISO strings without offset as UTC).
--
-- The lookup-flight edge function previously passed the FlightView API's local-time
-- strings directly (e.g. "2026-06-06T09:10:00" for 09:10 CEST) without converting
-- to UTC.  PostgreSQL stored that as 2026-06-06 09:10:00+00, but it should have
-- been 2026-06-06 07:10:00+00 (07:10 UTC = 09:10 CEST).
--
-- Strategy: cast the incorrect timestamptz to bare timestamp (stripping the +00
-- label), then re-interpret that wall-clock value in the airport's IANA timezone
-- and convert back to UTC.

UPDATE flights SET
  departure_time = (departure_time::timestamp AT TIME ZONE
    CASE departure_airport_code
      WHEN 'JFK' THEN 'America/New_York' WHEN 'LGA' THEN 'America/New_York' WHEN 'EWR' THEN 'America/New_York'
      WHEN 'BOS' THEN 'America/New_York' WHEN 'DCA' THEN 'America/New_York' WHEN 'IAD' THEN 'America/New_York'
      WHEN 'PHL' THEN 'America/New_York' WHEN 'CLT' THEN 'America/New_York' WHEN 'ATL' THEN 'America/New_York'
      WHEN 'MIA' THEN 'America/New_York' WHEN 'TPA' THEN 'America/New_York' WHEN 'MCO' THEN 'America/New_York'
      WHEN 'DTW' THEN 'America/New_York' WHEN 'ORD' THEN 'America/Chicago'  WHEN 'MDW' THEN 'America/Chicago'
      WHEN 'DFW' THEN 'America/Chicago'  WHEN 'IAH' THEN 'America/Chicago'  WHEN 'MSP' THEN 'America/Chicago'
      WHEN 'DEN' THEN 'America/Denver'   WHEN 'PHX' THEN 'America/Phoenix'  WHEN 'SLC' THEN 'America/Denver'
      WHEN 'SEA' THEN 'America/Los_Angeles' WHEN 'PDX' THEN 'America/Los_Angeles'
      WHEN 'SFO' THEN 'America/Los_Angeles' WHEN 'LAX' THEN 'America/Los_Angeles' WHEN 'SAN' THEN 'America/Los_Angeles'
      WHEN 'LAS' THEN 'America/Los_Angeles' WHEN 'HNL' THEN 'Pacific/Honolulu'
      WHEN 'LHR' THEN 'Europe/London'   WHEN 'LGW' THEN 'Europe/London'
      WHEN 'CDG' THEN 'Europe/Paris'    WHEN 'AMS' THEN 'Europe/Amsterdam'
      WHEN 'FRA' THEN 'Europe/Berlin'   WHEN 'MUC' THEN 'Europe/Berlin'
      WHEN 'FCO' THEN 'Europe/Rome'     WHEN 'MXP' THEN 'Europe/Rome'
      WHEN 'BCN' THEN 'Europe/Madrid'   WHEN 'MAD' THEN 'Europe/Madrid'
      WHEN 'ZRH' THEN 'Europe/Zurich'   WHEN 'VIE' THEN 'Europe/Vienna'
      WHEN 'CPH' THEN 'Europe/Copenhagen' WHEN 'ARN' THEN 'Europe/Stockholm' WHEN 'OSL' THEN 'Europe/Oslo'
      WHEN 'HEL' THEN 'Europe/Helsinki' WHEN 'DUB' THEN 'Europe/Dublin'     WHEN 'BRU' THEN 'Europe/Brussels'
      WHEN 'LIS' THEN 'Europe/Lisbon'   WHEN 'ATH' THEN 'Europe/Athens'     WHEN 'IST' THEN 'Europe/Istanbul'
      WHEN 'HND' THEN 'Asia/Tokyo'      WHEN 'NRT' THEN 'Asia/Tokyo'
      WHEN 'ICN' THEN 'Asia/Seoul'      WHEN 'PVG' THEN 'Asia/Shanghai'     WHEN 'PEK' THEN 'Asia/Shanghai'
      WHEN 'HKG' THEN 'Asia/Hong_Kong'  WHEN 'SIN' THEN 'Asia/Singapore'    WHEN 'BKK' THEN 'Asia/Bangkok'
      WHEN 'DEL' THEN 'Asia/Kolkata'    WHEN 'BOM' THEN 'Asia/Kolkata'
      WHEN 'DXB' THEN 'Asia/Dubai'
      WHEN 'SYD' THEN 'Australia/Sydney' WHEN 'MEL' THEN 'Australia/Sydney'  WHEN 'AKL' THEN 'Pacific/Auckland'
      ELSE 'UTC'
    END
  ),
  arrival_time = (arrival_time::timestamp AT TIME ZONE
    CASE arrival_airport_code
      WHEN 'JFK' THEN 'America/New_York' WHEN 'LGA' THEN 'America/New_York' WHEN 'EWR' THEN 'America/New_York'
      WHEN 'BOS' THEN 'America/New_York' WHEN 'DCA' THEN 'America/New_York' WHEN 'IAD' THEN 'America/New_York'
      WHEN 'PHL' THEN 'America/New_York' WHEN 'CLT' THEN 'America/New_York' WHEN 'ATL' THEN 'America/New_York'
      WHEN 'MIA' THEN 'America/New_York' WHEN 'TPA' THEN 'America/New_York' WHEN 'MCO' THEN 'America/New_York'
      WHEN 'DTW' THEN 'America/New_York' WHEN 'ORD' THEN 'America/Chicago'  WHEN 'MDW' THEN 'America/Chicago'
      WHEN 'DFW' THEN 'America/Chicago'  WHEN 'IAH' THEN 'America/Chicago'  WHEN 'MSP' THEN 'America/Chicago'
      WHEN 'DEN' THEN 'America/Denver'   WHEN 'PHX' THEN 'America/Phoenix'  WHEN 'SLC' THEN 'America/Denver'
      WHEN 'SEA' THEN 'America/Los_Angeles' WHEN 'PDX' THEN 'America/Los_Angeles'
      WHEN 'SFO' THEN 'America/Los_Angeles' WHEN 'LAX' THEN 'America/Los_Angeles' WHEN 'SAN' THEN 'America/Los_Angeles'
      WHEN 'LAS' THEN 'America/Los_Angeles' WHEN 'HNL' THEN 'Pacific/Honolulu'
      WHEN 'LHR' THEN 'Europe/London'   WHEN 'LGW' THEN 'Europe/London'
      WHEN 'CDG' THEN 'Europe/Paris'    WHEN 'AMS' THEN 'Europe/Amsterdam'
      WHEN 'FRA' THEN 'Europe/Berlin'   WHEN 'MUC' THEN 'Europe/Berlin'
      WHEN 'FCO' THEN 'Europe/Rome'     WHEN 'MXP' THEN 'Europe/Rome'
      WHEN 'BCN' THEN 'Europe/Madrid'   WHEN 'MAD' THEN 'Europe/Madrid'
      WHEN 'ZRH' THEN 'Europe/Zurich'   WHEN 'VIE' THEN 'Europe/Vienna'
      WHEN 'CPH' THEN 'Europe/Copenhagen' WHEN 'ARN' THEN 'Europe/Stockholm' WHEN 'OSL' THEN 'Europe/Oslo'
      WHEN 'HEL' THEN 'Europe/Helsinki' WHEN 'DUB' THEN 'Europe/Dublin'     WHEN 'BRU' THEN 'Europe/Brussels'
      WHEN 'LIS' THEN 'Europe/Lisbon'   WHEN 'ATH' THEN 'Europe/Athens'     WHEN 'IST' THEN 'Europe/Istanbul'
      WHEN 'HND' THEN 'Asia/Tokyo'      WHEN 'NRT' THEN 'Asia/Tokyo'
      WHEN 'ICN' THEN 'Asia/Seoul'      WHEN 'PVG' THEN 'Asia/Shanghai'     WHEN 'PEK' THEN 'Asia/Shanghai'
      WHEN 'HKG' THEN 'Asia/Hong_Kong'  WHEN 'SIN' THEN 'Asia/Singapore'    WHEN 'BKK' THEN 'Asia/Bangkok'
      WHEN 'DEL' THEN 'Asia/Kolkata'    WHEN 'BOM' THEN 'Asia/Kolkata'
      WHEN 'DXB' THEN 'Asia/Dubai'
      WHEN 'SYD' THEN 'Australia/Sydney' WHEN 'MEL' THEN 'Australia/Sydney'  WHEN 'AKL' THEN 'Pacific/Auckland'
      ELSE 'UTC'
    END
  )
WHERE
  -- Only backfill flights whose recorded time differs from what it would be
  -- if the stored value was treated as the airport's local time.
  -- For departure: check if the departure-airport timezone would shift it.
  departure_airport_code IN (
    'JFK','LGA','EWR','BOS','DCA','IAD','PHL','CLT','ATL','MIA','TPA','MCO',
    'DTW','ORD','MDW','DFW','IAH','MSP','DEN','PHX','SLC','SEA','PDX','SFO',
    'LAX','SAN','LAS','HNL','LHR','LGW','CDG','AMS','FRA','MUC','FCO','MXP',
    'BCN','MAD','ZRH','VIE','CPH','ARN','OSL','HEL','DUB','BRU','LIS','ATH',
    'IST','HND','NRT','ICN','PVG','PEK','HKG','SIN','BKK','DEL','BOM','DXB',
    'SYD','MEL','AKL'
  );
