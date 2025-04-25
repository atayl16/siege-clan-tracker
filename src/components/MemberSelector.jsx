import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import DataSelector from '../ui/DataSelector';
import Badge from './Badge';
import './MemberSelector.css';

export default function MemberSelector({
  onMemberSelect,
  selectedMemberId = null,
  disabled = false,
  viewMode = 'table',
  filterClaimed = false,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define columns for the table view
  const columns = [
    {
      header: 'Name',
      accessor: 'name',
    },
    {
      header: 'Level',
      accessor: 'current_lvl',
    },
    {
      header: 'Status',
      accessor: 'is_claimed',
      render: (member) => (
        <Badge variant={member.is_claimed ? 'success' : 'primary'} pill>
          {member.is_claimed ? 'Claimed' : 'Available'}
        </Badge>
      ),
    },
    {
      header: 'EHB',
      accessor: 'ehb',
      render: (member) => member.ehb || '0',
    },
    {
      header: 'Actions',
      render: (member) => (
        <button
          className="select-member-btn"
          onClick={() => onMemberSelect(member)}
          disabled={disabled || member.is_claimed}
        >
          Select
        </button>
      ),
    },
  ];

  // Fetch members when the component mounts or when filterClaimed changes
  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        
        // First query to get all members
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('*')
          .order('name', { ascending: true });

        if (membersError) throw membersError;
        
        // Second query to get claimed status
        const { data: claimsData, error: claimsError } = await supabase
          .from('member_claims')
          .select('wom_id');
          
        if (claimsError) throw claimsError;
        
        // Create a set of claimed member IDs for easy lookup
        const claimedIds = new Set(claimsData.map(claim => claim.wom_id));
        
        // Mark members as claimed or not
        const enhancedMembers = membersData.map(member => ({
          ...member,
          is_claimed: claimedIds.has(member.wom_id)
        }));
        
        // Filter out claimed members if needed
        const finalMembers = filterClaimed 
          ? enhancedMembers.filter(member => !member.is_claimed)
          : enhancedMembers;
          
        setMembers(finalMembers);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load members');
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [filterClaimed]);

  return (
    <DataSelector
      data={members}
      columns={columns}
      onSelect={onMemberSelect}
      selectedId={selectedMemberId}
      keyField="wom_id"
      searchFields={['name']}
      searchPlaceholder="Search members by name"
      viewMode={viewMode}
      labelField="name"
      valueField="wom_id"
      loading={loading}
      error={error}
      disabled={disabled}
      emptyMessage="No members found"
      className="member-selector"
    />
  );
}
