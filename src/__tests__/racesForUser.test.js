import { racesForUser } from '../utils/races';

const user = { id: 'u1' };
const claims = [{ wom_id: 1, members: { wom_id: 1, name: 'Roinrin' } }];

const race = (over) => ({ id: 'r', creator_id: 'someone-else', participants: [], ...over });

describe('racesForUser', () => {
  it('includes races the user created', () => {
    expect(racesForUser([race({ id: 'a', creator_id: 'u1' })], user, claims)).toHaveLength(1);
  });

  it("includes another member's race that one of the user's characters is in", () => {
    // Regression: compared participant.player_id, which does not exist.
    const theirs = race({ id: 'b', participants: [{ wom_id: 1 }, { wom_id: 99 }] });
    expect(racesForUser([theirs], user, claims)).toEqual([theirs]);
  });

  it('excludes races the user neither created nor is in', () => {
    expect(racesForUser([race({ participants: [{ wom_id: 99 }] })], user, claims)).toEqual([]);
  });

  it('copes with no races, no claims and string ids', () => {
    expect(racesForUser(null, user, claims)).toEqual([]);
    expect(racesForUser([race({ participants: [{ wom_id: '1' }] })], user, [])).toEqual([]);
    expect(racesForUser([race({ participants: [{ wom_id: '1' }] })], user, claims)).toHaveLength(1);
  });
});
