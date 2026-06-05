-- Migration 007 incorrectly re-applied the timezone conversion to already-correct
-- UTC data. It did: (correct_utc::timestamp AT TIME ZONE airport_tz), which added
-- the airport's offset to the wall-clock time (shifting times forward for
-- negative-offset timezones like US Eastern, and backward for positive-offset
-- timezones like Europe/Paris).
--
-- To reverse: (wrong_utc AT TIME ZONE airport_tz) AT TIME ZONE 'UTC'
-- This strips the wrong timezone back to local time and re-interprets as UTC.

UPDATE flights SET
  departure_time = (departure_time AT TIME ZONE
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
  ) AT TIME ZONE 'UTC',
  arrival_time = (arrival_time AT TIME ZONE
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
  ) AT TIME ZONE 'UTC'
WHERE
  departure_airport_code IN (
    'JFK','LGA','EWR','BOS','DCA','IAD','PHL','CLT','ATL','MIA','TPA','MCO',
    'DTW','ORD','MDW','DFW','IAH','MSP','DEN','PHX','SLC','SEA','PDX','SFO',
    'LAX','SAN','LAS','HNL','LHR','LGW','CDG','AMS','FRA','MUC','FCO','MXP',
    'BCN','MAD','ZRH','VIE','CPH','ARN','OSL','HEL','DUB','BRU','LIS','ATH',
    'IST','HND','NRT','ICN','PVG','PEK','HKG','SIN','BKK','DEL','BOM','DXB',
    'SYD','MEL','AKL'
  )
  OR arrival_airport_code IN (
    'JFK','LGA','EWR','BOS','DCA','IAD','PHL','CLT','ATL','MIA','TPA','MCO',
    'DTW','ORD','MDW','DFW','IAH','MSP','DEN','PHX','SLC','SEA','PDX','SFO',
    'LAX','SAN','LAS','HNL','LHR','LGW','CDG','AMS','FRA','MUC','FCO','MXP',
    'BCN','MAD','ZRH','VIE','CPH','ARN','OSL','HEL','DUB','BRU','LIS','ATH',
    'IST','HND','NRT','ICN','PVG','PEK','HKG','SIN','BKK','DEL','BOM','DXB',
    'SYD','MEL','AKL'
  );
