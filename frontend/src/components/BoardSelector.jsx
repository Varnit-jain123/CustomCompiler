import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Cpu } from 'lucide-react';

const BoardSelector = ({ selectedBoard, onSelect }) => {
  const [boards, setBoards] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      setLoading(true);
      const response = await apiService.getBoards();
      setBoards(response.data.boards);
      setCategories(response.data.categories);
      
      // Auto-select first board if none selected
      if (!selectedBoard && response.data.boards.length > 0) {
        onSelect(response.data.boards[0].id);
      }
    } catch (err) {
      setError('Failed to load boards');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBoardChange = (e) => {
    onSelect(e.target.value);
  };

  if (loading) {
    return (
      <div className="board-selector loading">
        <Cpu size={16} />
        <span>Loading boards...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="board-selector error">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="board-selector">
      <label htmlFor="board-select">
        <Cpu size={16} />
        <span>Board:</span>
      </label>
      <select
        id="board-select"
        value={selectedBoard || ''}
        onChange={handleBoardChange}
      >
        {Object.entries(categories).map(([category, boardIds]) => (
          <optgroup key={category} label={category}>
            {boardIds.map(boardId => {
              const board = boards.find(b => b.id === boardId);
              return board ? (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ) : null;
            })}
          </optgroup>
        ))}
      </select>
      {selectedBoard && (
        <div className="board-info">
          {(() => {
            const board = boards.find(b => b.id === selectedBoard);
            return board ? (
              <span>
                {board.architecture.toUpperCase()} | 
                Flash: {(board.specs.flash / 1024).toFixed(0)}KB | 
                SRAM: {(board.specs.sram / 1024).toFixed(0)}KB
              </span>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default BoardSelector;