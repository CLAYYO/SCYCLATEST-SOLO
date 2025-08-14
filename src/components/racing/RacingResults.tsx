import React from 'react';
import { formatDate } from '../../utils';

interface RaceResult {
  id: string;
  place: number;
  division: string;
  sail_no: string;
  name: string;
  age_group?: string;
  race_scores: number[];
  total: number;
  nett: number;
  dnc_count?: number;
}

interface RaceInfo {
  id: string;
  name: string;
  date: string;
  venue: string;
}

interface RacingResultsProps {
  seriesTitle: string;
  races: RaceInfo[];
  results: RaceResult[];
  divisions: string[];
  lastUpdated?: string;
  isProvisional?: boolean;
}

const RacingResults: React.FC<RacingResultsProps> = ({
  seriesTitle,
  races,
  results,
  divisions,
  lastUpdated,
  isProvisional = false
}) => {
  const getRankClass = (place: number): string => {
    switch (place) {
      case 1:
        return 'rank1';
      case 2:
        return 'rank2';
      case 3:
        return 'rank3';
      default:
        return '';
    }
  };

  const formatScore = (score: number): string => {
    if (score === 999 || score === 0) return 'DNC';
    return score.toString();
  };

  const getResultsByDivision = (division: string) => {
    return results.filter(result => result.division === division)
                 .sort((a, b) => a.place - b.place);
  };

  return (
    <div className="racing-results-container">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-navy-900 mb-2">
          {seriesTitle}
        </h1>
        {isProvisional && (
          <p className="text-lg text-amber-600 font-medium mb-2">
            ⚠️ Provisional Results
          </p>
        )}
        {lastUpdated && (
          <p className="text-sm text-gray-600">
            Last updated: {formatDate(new Date(lastUpdated))}
          </p>
        )}
      </div>

      {/* Results by Division */}
      {divisions.map((division) => {
        const divisionResults = getResultsByDivision(division);
        
        if (divisionResults.length === 0) return null;

        return (
          <div key={division} className="mb-12">
            {/* Division Header */}
            <h2 className="text-2xl font-bold text-navy-900 mb-6 border-b-2 border-gold-400 pb-2">
              {division} Division
            </h2>

            {/* Summary Table */}
            <div className="overflow-x-auto mb-8">
              <table className="sailwave-results w-full">
                <thead>
                  <tr className="titlerow">
                    <th>Place</th>
                    <th>Division</th>
                    <th>SailNo</th>
                    <th>Name</th>
                    <th>Age Group</th>
                    {races.map((race, index) => (
                      <th key={race.id} className="race-header">
                        <div className="text-xs">
                          R{index + 1}
                        </div>
                        <div className="text-xs font-normal">
                          {race.venue}
                        </div>
                      </th>
                    ))}
                    <th>Total</th>
                    <th>Nett</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionResults.map((result) => (
                    <tr key={result.id} className={getRankClass(result.place)}>
                      <td className="place-cell">{result.place}</td>
                      <td>{result.division}</td>
                      <td className="sail-no">{result.sail_no}</td>
                      <td className="competitor-name">{result.name}</td>
                      <td>{result.age_group || '-'}</td>
                      {result.race_scores.map((score, index) => (
                        <td key={index} className="score-cell">
                          {formatScore(score)}
                        </td>
                      ))}
                      <td className="total-cell">{result.total}</td>
                      <td className="nett-cell font-bold">{result.nett}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Division Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Competitors:</strong> {divisionResults.length}
                </div>
                <div>
                  <strong>Races:</strong> {races.length}
                </div>
                <div>
                  <strong>Scoring:</strong> Low Point System
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Race Details */}
      <div className="mt-12 bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-navy-900 mb-4">Race Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {races.map((race, index) => (
            <a 
              key={race.id} 
              href={`/racing/results/${race.id}`}
              className="border border-gray-100 rounded p-3 hover:border-gold-400 hover:shadow-md transition-all duration-200 block"
            >
              <div className="font-semibold text-navy-900 hover:text-gold-600">
                Race {index + 1}: {race.name}
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(new Date(race.date))}
              </div>
              <div className="text-sm text-gray-600">
                Venue: {race.venue}
              </div>
              <div className="text-xs text-gold-600 mt-2 font-medium">
                View detailed results →
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Footer Notes */}
      <div className="mt-8 text-sm text-gray-600 space-y-2">
        <p><strong>Scoring System:</strong> Low Point System</p>
        <p><strong>DNC:</strong> Did Not Compete</p>
        <p><strong>Nett:</strong> Total points minus worst race (if applicable)</p>
        {isProvisional && (
          <p className="text-amber-600">
            <strong>Note:</strong> These are provisional results and may be subject to change pending protest resolution.
          </p>
        )}
      </div>
    </div>
  );
};

export default RacingResults;