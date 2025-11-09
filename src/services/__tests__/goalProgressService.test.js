import { describe, it, expect } from 'vitest';
import { extractMetricData } from '../goalProgressService';

describe('goalProgressService', () => {
  describe('extractMetricData', () => {
    describe('null and undefined handling', () => {
      it('returns null for null playerData', () => {
        expect(extractMetricData(null, 'skill', 'attack')).toBeNull();
      });

      it('returns null for undefined playerData', () => {
        expect(extractMetricData(undefined, 'skill', 'attack')).toBeNull();
      });

      it('returns default for empty object playerData', () => {
        expect(extractMetricData({}, 'skill', 'attack')).toEqual({ experience: 0, level: 1, rank: 0 });
      });
    });

    describe('skill metrics', () => {
      describe('latestSnapshot.data.skills path', () => {
        it('extracts skill data from latestSnapshot.data.skills', () => {
          const playerData = {
            latestSnapshot: {
              data: {
                skills: {
                  attack: { experience: 13034431, level: 99, rank: 123456 }
                }
              }
            }
          };

          const result = extractMetricData(playerData, 'skill', 'attack');
          expect(result).toEqual({ experience: 13034431, level: 99, rank: 123456 });
        });

        it('handles multiple skills in latestSnapshot', () => {
          const playerData = {
            latestSnapshot: {
              data: {
                skills: {
                  attack: { experience: 13034431, level: 99, rank: 123456 },
                  defence: { experience: 5000000, level: 85, rank: 789012 },
                  strength: { experience: 20000000, level: 99, rank: 50000 }
                }
              }
            }
          };

          expect(extractMetricData(playerData, 'skill', 'attack').experience).toBe(13034431);
          expect(extractMetricData(playerData, 'skill', 'defence').level).toBe(85);
          expect(extractMetricData(playerData, 'skill', 'strength').rank).toBe(50000);
        });
      });

      describe('data.skills fallback path', () => {
        it('extracts skill data from data.skills when latestSnapshot.data.skills missing', () => {
          const playerData = {
            data: {
              skills: {
                mining: { experience: 8000000, level: 90, rank: 234567 }
              }
            }
          };

          const result = extractMetricData(playerData, 'skill', 'mining');
          expect(result).toEqual({ experience: 8000000, level: 90, rank: 234567 });
        });

        it('prefers latestSnapshot over data.skills when both exist', () => {
          const playerData = {
            latestSnapshot: {
              data: {
                skills: {
                  fishing: { experience: 15000000, level: 99, rank: 100000 }
                }
              }
            },
            data: {
              skills: {
                fishing: { experience: 10000000, level: 95, rank: 200000 } // Older data
              }
            }
          };

          const result = extractMetricData(playerData, 'skill', 'fishing');
          expect(result.experience).toBe(15000000); // Should use latestSnapshot
        });
      });

      describe('skills direct path', () => {
        it('extracts skill data from direct skills property', () => {
          const playerData = {
            skills: {
              woodcutting: { experience: 12000000, level: 97, rank: 345678 }
            }
          };

          const result = extractMetricData(playerData, 'skill', 'woodcutting');
          expect(result).toEqual({ experience: 12000000, level: 97, rank: 345678 });
        });

        it('falls back to skills when other paths missing', () => {
          const playerData = {
            // No latestSnapshot or data
            skills: {
              cooking: { experience: 13034431, level: 99, rank: 123456 }
            }
          };

          const result = extractMetricData(playerData, 'skill', 'cooking');
          expect(result.experience).toBe(13034431);
        });
      });

      describe('default return for missing skills', () => {
        it('returns default skill data when skill not found', () => {
          const playerData = {
            skills: {
              attack: { experience: 1000, level: 10, rank: 999999 }
            }
          };

          const result = extractMetricData(playerData, 'skill', 'runecraft');
          expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
        });

        it('returns default for completely empty playerData structure', () => {
          const playerData = {};
          const result = extractMetricData(playerData, 'skill', 'attack');
          expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
        });
      });

      describe('all skill types', () => {
        it('handles all OSRS skills correctly', () => {
          const skills = [
            'attack', 'defence', 'strength', 'hitpoints', 'ranged', 'prayer', 'magic',
            'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking', 'crafting',
            'smithing', 'mining', 'herblore', 'agility', 'thieving', 'slayer', 'farming',
            'runecraft', 'hunter', 'construction'
          ];

          const playerData = {
            skills: skills.reduce((acc, skill) => {
              acc[skill] = { experience: 13034431, level: 99, rank: 123456 };
              return acc;
            }, {})
          };

          skills.forEach(skill => {
            const result = extractMetricData(playerData, 'skill', skill);
            expect(result).toEqual({ experience: 13034431, level: 99, rank: 123456 });
          });
        });
      });
    });

    describe('boss metrics', () => {
      describe('latestSnapshot.data.bosses path', () => {
        it('extracts boss data from latestSnapshot.data.bosses', () => {
          const playerData = {
            latestSnapshot: {
              data: {
                bosses: {
                  zulrah: { kills: 1234, rank: 56789 }
                }
              }
            }
          };

          const result = extractMetricData(playerData, 'boss', 'zulrah');
          expect(result).toEqual({ kills: 1234, rank: 56789 });
        });

        it('handles multiple bosses in latestSnapshot', () => {
          const playerData = {
            latestSnapshot: {
              data: {
                bosses: {
                  zulrah: { kills: 1234, rank: 56789 },
                  vorkath: { kills: 500, rank: 12345 },
                  'theatre_of_blood': { kills: 100, rank: 5000 }
                }
              }
            }
          };

          expect(extractMetricData(playerData, 'boss', 'zulrah').kills).toBe(1234);
          expect(extractMetricData(playerData, 'boss', 'vorkath').kills).toBe(500);
          expect(extractMetricData(playerData, 'boss', 'theatre_of_blood').kills).toBe(100);
        });
      });

      describe('data.bosses fallback path', () => {
        it('extracts boss data from data.bosses when latestSnapshot.data.bosses missing', () => {
          const playerData = {
            data: {
              bosses: {
                corporeal_beast: { kills: 789, rank: 23456 }
              }
            }
          };

          const result = extractMetricData(playerData, 'boss', 'corporeal_beast');
          expect(result).toEqual({ kills: 789, rank: 23456 });
        });

        it('prefers latestSnapshot over data.bosses when both exist', () => {
          const playerData = {
            latestSnapshot: {
              data: {
                bosses: {
                  bandos: { kills: 300, rank: 10000 }
                }
              }
            },
            data: {
              bosses: {
                bandos: { kills: 200, rank: 15000 } // Older data
              }
            }
          };

          const result = extractMetricData(playerData, 'boss', 'bandos');
          expect(result.kills).toBe(300); // Should use latestSnapshot
        });
      });

      describe('bosses direct path', () => {
        it('extracts boss data from direct bosses property', () => {
          const playerData = {
            bosses: {
              cerberus: { kills: 456, rank: 34567 }
            }
          };

          const result = extractMetricData(playerData, 'boss', 'cerberus');
          expect(result).toEqual({ kills: 456, rank: 34567 });
        });

        it('falls back to bosses when other paths missing', () => {
          const playerData = {
            // No latestSnapshot or data
            bosses: {
              hydra: { kills: 987, rank: 45678 }
            }
          };

          const result = extractMetricData(playerData, 'boss', 'hydra');
          expect(result.kills).toBe(987);
        });
      });

      describe('default return for missing bosses', () => {
        it('returns default boss data when boss not found', () => {
          const playerData = {
            bosses: {
              zulrah: { kills: 100, rank: 50000 }
            }
          };

          const result = extractMetricData(playerData, 'boss', 'vorkath');
          expect(result).toEqual({ kills: 0, rank: 0 });
        });

        it('returns default for completely empty playerData structure', () => {
          const playerData = {};
          const result = extractMetricData(playerData, 'boss', 'zulrah');
          expect(result).toEqual({ kills: 0, rank: 0 });
        });
      });

      describe('common bosses', () => {
        it('handles major OSRS bosses correctly', () => {
          const bosses = [
            'zulrah', 'vorkath', 'hydra', 'cerberus', 'kraken', 'thermonuclear_smoke_devil',
            'abyssal_sire', 'corporeal_beast', 'kril_tsutsaroth', 'kreearra', 'commander_zilyana',
            'general_graardor', 'theatre_of_blood', 'chambers_of_xeric', 'tztok_jad'
          ];

          const playerData = {
            bosses: bosses.reduce((acc, boss) => {
              acc[boss] = { kills: 500, rank: 10000 };
              return acc;
            }, {})
          };

          bosses.forEach(boss => {
            const result = extractMetricData(playerData, 'boss', boss);
            expect(result).toEqual({ kills: 500, rank: 10000 });
          });
        });
      });
    });

    describe('unknown metric types', () => {
      it('returns null for unknown metric type', () => {
        const playerData = {
          skills: { attack: { experience: 1000, level: 10, rank: 999999 } }
        };

        const result = extractMetricData(playerData, 'unknown', 'attack');
        expect(result).toBeNull();
      });

      it('returns null for empty string type', () => {
        const playerData = {
          skills: { attack: { experience: 1000, level: 10, rank: 999999 } }
        };

        const result = extractMetricData(playerData, '', 'attack');
        expect(result).toBeNull();
      });
    });

    describe('edge cases and data integrity', () => {
      it('handles zero values correctly', () => {
        const playerData = {
          skills: {
            attack: { experience: 0, level: 1, rank: 0 }
          }
        };

        const result = extractMetricData(playerData, 'skill', 'attack');
        expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
      });

      it('handles very large numbers', () => {
        const playerData = {
          skills: {
            attack: { experience: 200000000, level: 99, rank: 1 }
          }
        };

        const result = extractMetricData(playerData, 'skill', 'attack');
        expect(result.experience).toBe(200000000);
      });

      it('handles boss kills of 0', () => {
        const playerData = {
          bosses: {
            zulrah: { kills: 0, rank: 0 }
          }
        };

        const result = extractMetricData(playerData, 'boss', 'zulrah');
        expect(result).toEqual({ kills: 0, rank: 0 });
      });

      it('handles partial data structures gracefully', () => {
        const playerData = {
          latestSnapshot: {
            // Missing data property
          }
        };

        const result = extractMetricData(playerData, 'skill', 'attack');
        expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
      });

      it('handles nested null values', () => {
        const playerData = {
          latestSnapshot: {
            data: null
          }
        };

        const result = extractMetricData(playerData, 'skill', 'attack');
        expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
      });

      it('handles case sensitivity in metric names', () => {
        const playerData = {
          skills: {
            attack: { experience: 1000, level: 10, rank: 999999 }
          }
        };

        // Should not find 'Attack' (capital A)
        const result = extractMetricData(playerData, 'skill', 'Attack');
        expect(result).toEqual({ experience: 0, level: 1, rank: 0 });
      });
    });

    describe('real-world API response structures', () => {
      it('handles WiseOldMan API response structure', () => {
        // Realistic WOM API response
        const playerData = {
          latestSnapshot: {
            id: 123456,
            playerId: 789012,
            createdAt: '2024-01-01T00:00:00.000Z',
            importedAt: null,
            data: {
              skills: {
                attack: { rank: 123456, level: 99, experience: 13034431 },
                overall: { rank: 50000, level: 2277, experience: 500000000 }
              },
              bosses: {
                zulrah: { rank: 10000, kills: 1500 },
                vorkath: { rank: 20000, kills: 800 }
              }
            }
          }
        };

        const attackResult = extractMetricData(playerData, 'skill', 'attack');
        expect(attackResult).toEqual({ rank: 123456, level: 99, experience: 13034431 });

        const zulrahResult = extractMetricData(playerData, 'boss', 'zulrah');
        expect(zulrahResult).toEqual({ rank: 10000, kills: 1500 });
      });

      it('handles direct player data without snapshot wrapper', () => {
        // Some API endpoints return direct data
        const playerData = {
          skills: {
            attack: { experience: 13034431, level: 99, rank: 123456 }
          },
          bosses: {
            zulrah: { kills: 1234, rank: 56789 }
          }
        };

        expect(extractMetricData(playerData, 'skill', 'attack').experience).toBe(13034431);
        expect(extractMetricData(playerData, 'boss', 'zulrah').kills).toBe(1234);
      });
    });
  });
});
