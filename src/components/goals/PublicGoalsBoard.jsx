import React, { useState, useMemo } from 'react';
import { usePublicGoals } from '../../context/DataContext';
import GoalProgress from './GoalProgress';
import { FaFilter, FaSort } from 'react-icons/fa';
import { titleize } from '../../utils/stringUtils';
import './PublicGoalsBoard.css';

import Card from '../ui/Card';
import Button from '../ui/Button';

export default function PublicGoalsBoard() {
  const { publicGoals, loading } = usePublicGoals();
  const [sortBy, setSortBy] = useState('progress');
  const [filterType, setFilterType] = useState('all');
  
  const sortedGoals = useMemo(() => {
    if (!publicGoals) return [];
    
    let filtered = publicGoals;
    
    // Apply filters
    if (filterType !== 'all') {
      filtered = filtered.filter(goal => goal.goal_type === filterType);
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sortBy === 'progress') {
        const progressA = (a.current_value - a.start_value) / (a.target_value - a.start_value);
        const progressB = (b.current_value - b.start_value) / (b.target_value - b.start_value);
        return progressB - progressA;
      } else if (sortBy === 'recent') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'deadline') {
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return new Date(a.target_date) - new Date(b.target_date);
      }
      return 0;
    });
  }, [publicGoals, sortBy, filterType]);
  
  if (loading) {
    return <div className="ui-loading-container">Loading public goals...</div>;
  }
  
  return (
    <div className="ui-public-goals-board">
      <div className="ui-board-header">
        <h2>Member Goals Board</h2>
        <div className="ui-board-controls">
          <div className="ui-filter-group">
            <label><FaFilter /> Filter:</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="skill">Skills</option>
              <option value="boss">Bosses</option>
            </select>
          </div>
          <div className="ui-sort-group">
            <label><FaSort /> Sort By:</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="progress">Progress</option>
              <option value="recent">Recently Added</option>
              <option value="deadline">Upcoming Deadlines</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="ui-public-goals-grid">
        {sortedGoals.length === 0 ? (
          <div className="ui-empty-message">No public goals found</div>
        ) : (
          sortedGoals.map(goal => (
            <Card key={goal.id} className="ui-public-goal-card">
              <Card.Header>
                <div className="ui-goal-player">{titleize(goal.player_name)}</div>
                <div className="ui-goal-type">{goal.goal_type}</div>
              </Card.Header>
              <Card.Body>
                <h3 className="ui-goal-metric">{titleize(goal.metric)}</h3>
                <GoalProgress goal={goal} />
                
                <div className="ui-goal-details">
                  {goal.target_date && (
                    <div className="ui-goal-deadline">
                      <span>Deadline: {new Date(goal.target_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
