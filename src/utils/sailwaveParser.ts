import { JSDOM } from 'jsdom';

export interface ParsedRaceData {
  title: string;
  date: string;
  venue: string;
  divisions: string[];
  competitors: {
    place: number;
    division: string;
    sailNumber: string;
    name: string;
    ageGroup: string;
    scores: number[];
    total: number;
    nett: number;
    status?: string;
  }[];
  raceVenues: string[];
  provisionalTimestamp?: string;
}

export interface RaceScore {
  score: number;
  status?: string; // DNC, DNF, etc.
  rank?: number; // 1, 2, 3 for podium positions
}

/**
 * Parse Sailwave HTML file and extract race data
 */
export function parseSailwaveHTML(htmlContent: string): ParsedRaceData {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Extract title from h1 tag
  const titleElement = document.querySelector('h1');
  const title = titleElement?.textContent?.trim() || 'Unknown Series';

  // Extract subtitle/venue info from h2
  const subtitleElement = document.querySelector('h2');
  const subtitle = subtitleElement?.textContent?.trim() || '';

  // Extract provisional timestamp
  const provisionalElement = document.querySelector('.seriestitle');
  const provisionalText = provisionalElement?.textContent?.trim();
  const provisionalTimestamp = provisionalText?.includes('provisional') ? provisionalText : undefined;

  // Extract divisions from summary titles
  const divisionElements = document.querySelectorAll('.summarytitle');
  const divisions = Array.from(divisionElements).map(el => 
    el.textContent?.replace(' Division', '').trim() || ''
  ).filter(Boolean);

  // Extract race venues from table headers
  const raceVenues: string[] = [];
  const headerRows = document.querySelectorAll('.titlerow');
  if (headerRows.length > 0) {
    const raceHeaders = headerRows[0].querySelectorAll('th');
    // Skip first 5 columns (Place, Division, SailNo, Name, Age Group) and last 2 (Total, Nett)
    for (let i = 5; i < raceHeaders.length - 2; i++) {
      const venueText = raceHeaders[i].textContent?.trim().replace(/\s+/g, ' ');
      if (venueText) {
        raceVenues.push(venueText);
      }
    }
  }

  // Parse competitors from all divisions
  const competitors: ParsedRaceData['competitors'] = [];
  const summaryRows = document.querySelectorAll('.summaryrow');

  summaryRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return; // Skip invalid rows

    const place = parseInt(cells[0].textContent?.trim() || '0');
    const division = cells[1].textContent?.trim() || '';
    const sailNumber = cells[2].textContent?.trim() || '';
    const name = cells[3].textContent?.trim() || '';
    const ageGroup = cells[4].textContent?.trim() || '';

    // Parse race scores
    const scores: number[] = [];
    const raceScores: RaceScore[] = [];
    
    // Process race score cells (skip first 5 and last 2)
    for (let i = 5; i < cells.length - 2; i++) {
      const cell = cells[i];
      const cellText = cell.textContent?.trim() || '';
      
      let score = 0;
      let status: string | undefined;
      let rank: number | undefined;
      
      // Check for DNC, DNF, etc.
      if (cellText.includes('DNC')) {
        status = 'DNC';
        score = parseFloat(cellText.replace('DNC', '').trim()) || 0;
      } else if (cellText.includes('DNF')) {
        status = 'DNF';
        score = parseFloat(cellText.replace('DNF', '').trim()) || 0;
      } else {
        score = parseFloat(cellText) || 0;
      }
      
      // Check for ranking classes
      if (cell.classList.contains('rank1')) rank = 1;
      else if (cell.classList.contains('rank2')) rank = 2;
      else if (cell.classList.contains('rank3')) rank = 3;
      
      scores.push(score);
      raceScores.push({ score, status, rank });
    }

    // Parse total and nett scores
    const totalCell = cells[cells.length - 2];
    const nettCell = cells[cells.length - 1];
    
    const total = parseFloat(totalCell?.textContent?.trim() || '0');
    const nett = parseFloat(nettCell?.textContent?.trim() || '0');

    competitors.push({
      place,
      division,
      sailNumber,
      name,
      ageGroup,
      scores,
      total,
      nett,
      status: raceScores.some(rs => rs.status) ? 
        raceScores.filter(rs => rs.status).map(rs => rs.status).join(', ') : undefined
    });
  });

  return {
    title,
    date: subtitle,
    venue: subtitle,
    divisions,
    competitors,
    raceVenues,
    provisionalTimestamp
  };
}

/**
 * Validate parsed race data
 */
export function validateRaceData(data: ParsedRaceData): string[] {
  const errors: string[] = [];

  if (!data.title || data.title === 'Unknown Series') {
    errors.push('Race title is missing or invalid');
  }

  if (data.divisions.length === 0) {
    errors.push('No divisions found in the race data');
  }

  if (data.competitors.length === 0) {
    errors.push('No competitors found in the race data');
  }

  if (data.raceVenues.length === 0) {
    errors.push('No race venues found in the data');
  }

  // Validate competitor data
  data.competitors.forEach((competitor, index) => {
    if (!competitor.name) {
      errors.push(`Competitor ${index + 1}: Missing name`);
    }
    if (!competitor.sailNumber) {
      errors.push(`Competitor ${index + 1}: Missing sail number`);
    }
    if (competitor.scores.length !== data.raceVenues.length) {
      errors.push(`Competitor ${index + 1}: Score count doesn't match race count`);
    }
  });

  return errors;
}

/**
 * Sanitize HTML content before parsing
 */
export function sanitizeHTML(htmlContent: string): string {
  // Remove script tags and other potentially dangerous content
  return htmlContent
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/javascript:/gi, ''); // Remove javascript: URLs
}