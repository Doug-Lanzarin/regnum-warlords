// Full hand-fetched snapshot of cort.ovh's stats.json, pulled directly from
// cort.ovh from outside Vercel's network — same story and same reason as
// _eventsBackfill.ts (see api/cort-proxy.ts's doc comment): Vercel still
// cannot reach cort.ovh directly, and the mirror's (cort.go.yo.fr) own
// stats.json is computed server-side from its own incomplete event history,
// so its forts.total/wishes.count are undercounted the same way its
// events.json is — confirmed 2026-09-21: mirror reported ~198/188/191 forts
// for the 7d window across the three realms, versus cort.ovh's own 299/278/292
// for the identical window.
//
// Unlike events.json, stats.json has no raw list to merge/dedupe — it's a
// pre-aggregated rolling-window report, so there's no way to correct the
// mirror's copy in place. Instead, this whole snapshot substitutes for the
// mirror's when cort.ovh's own live fetch fails (see cort-proxy.ts's stats
// handling) — a frozen answer beats a wrong one, but it *is* frozen: every
// field here stops advancing the moment this was captured, so this needs
// re-refreshing from cort.ovh periodically while Vercel still can't reach it
// directly. Not used for the "7d" window at all — WzStatusPage computes that
// one directly from the (self-correcting, union-merged) events dump instead,
// since 7 days comfortably fits inside events.json's own ~10-day retention.

import type { WzStatsDump } from "../src/types/wz.js";

const statsBackfill: WzStatsDump = [
	{
		"generated": 1789962781,
		"activity": {
			"Alsius": [
				0.4157303370786518,
				0.2359550561797754,
				-0.2134831460674157,
				-0.7078651685393258,
				-0.7415730337078651,
				-0.651685393258427,
				-0.4157303370786517,
				-0.4269662921348315,
				-0.3146067415730337,
				-0.0898876404494382,
				0.12359550561797755,
				0.2471910112359551,
				0.30337078651685395,
				0.5505617977528089,
				0.8876404494382023,
				0.7752808988764045,
				0.0786516853932584,
				-0.0674157303370787,
				-0.4606741573033709,
				-0.4943820224719102,
				-0.3370786516853933,
				-0.3820224719101123,
				-0.2696629213483147,
				-0.12359550561797761
			],
			"Ignis": [
				0.3707865168539327,
				0.5505617977528089,
				0.6404494382022473,
				0.9101123595505617,
				0.4382022471910113,
				-0.6067415730337078,
				-0.595505617977528,
				-0.1460674157303371,
				-0.2921348314606742,
				0.03370786516853935,
				-0.10112359550561795,
				0.12359550561797755,
				-0.0449438202247191,
				0.1573033707865169,
				-0.26966292134831465,
				-0.4719101123595505,
				0.2359550561797753,
				0.2921348314606741,
				0.7415730337078652,
				0.853932584269663,
				0.6292134831460674,
				0.6067415730337078,
				0.404494382022472,
				0.2247191011235956
			],
			"Syrtis": [
				-0.146067415730337,
				-0.4719101123595505,
				-0.0898876404494382,
				0.5168539325842696,
				0.7865168539325843,
				1.404494382022472,
				1.2247191011235954,
				0.46067415730337075,
				0.14606741573033705,
				0.13483146067415733,
				0.03370786516853935,
				-0.1123595505617978,
				-0.0561797752808989,
				-0.1460674157303371,
				-0.7640449438202246,
				-0.38202247191011235,
				-0.34831460674157305,
				0.0561797752808989,
				0.2022471910112359,
				-0.13483146067415724,
				0.0337078651685393,
				0.0674157303370787,
				0.10112359550561811,
				0.1797752808988764
			]
		},
		"invasions": {
			"Alsius": [
				0.0449438202247191,
				0.033707865168539325,
				0.011235955056179775,
				-0.0449438202247191,
				-0.14606741573033707,
				-0.1348314606741573,
				-0.07865168539325842,
				-0.0898876404494382,
				-0.06741573033707865,
				-0.02247191011235955,
				0.02247191011235955,
				0.0449438202247191,
				0.07865168539325842,
				0.1348314606741573,
				0.1797752808988764,
				0.16853932584269662,
				0.06741573033707865,
				0.033707865168539325,
				0,
				0,
				0,
				-0.011235955056179775,
				-0.011235955056179775,
				0.011235955056179775
			],
			"Ignis": [
				-0.011235955056179775,
				-0.02247191011235955,
				0.033707865168539325,
				0.15730337078651685,
				0.02247191011235955,
				-0.0449438202247191,
				-0.0449438202247191,
				-0.02247191011235955,
				-0.02247191011235955,
				-0.011235955056179775,
				0,
				-0.011235955056179775,
				-0.033707865168539325,
				0,
				-0.056179775280898875,
				-0.11235955056179775,
				-0.0449438202247191,
				0,
				0.011235955056179775,
				0.033707865168539325,
				0,
				0.011235955056179775,
				0.011235955056179775,
				-0.033707865168539325
			],
			"Syrtis": [
				-0.02247191011235955,
				-0.0449438202247191,
				-0.02247191011235955,
				0.02247191011235955,
				0.07865168539325842,
				0.1348314606741573,
				0.16853932584269662,
				0.056179775280898875,
				0.011235955056179775,
				0.033707865168539325,
				0,
				-0.0449438202247191,
				-0.02247191011235955,
				-0.056179775280898875,
				-0.14606741573033707,
				-0.11235955056179775,
				-0.056179775280898875,
				-0.02247191011235955,
				-0.011235955056179775,
				-0.033707865168539325,
				-0.011235955056179775,
				0,
				0.033707865168539325,
				0
			]
		},
		"gems": {
			"Alsius": [
				1,
				0,
				0,
				0,
				0,
				0,
				2,
				0,
				0,
				0,
				2,
				5,
				11,
				11,
				25,
				25,
				6,
				7,
				1,
				0,
				1,
				0,
				0,
				1
			],
			"Ignis": [
				1,
				0,
				5,
				17,
				15,
				5,
				7,
				8,
				6,
				2,
				1,
				2,
				0,
				1,
				0,
				4,
				0,
				3,
				0,
				5,
				1,
				0,
				2,
				0
			],
			"Syrtis": [
				2,
				5,
				3,
				7,
				19,
				25,
				34,
				6,
				9,
				3,
				5,
				2,
				0,
				1,
				2,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				2,
				7
			]
		},
		"wishes": {
			"Alsius": [
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				1,
				2,
				3,
				3,
				3,
				3,
				1,
				0,
				0,
				0,
				0,
				0,
				0
			],
			"Ignis": [
				0,
				0,
				0,
				2,
				2,
				0,
				0,
				1,
				3,
				0,
				0,
				0,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				1,
				1,
				0,
				0,
				0
			],
			"Syrtis": [
				1,
				0,
				0,
				0,
				1,
				4,
				6,
				5,
				0,
				2,
				0,
				1,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				0,
				1
			]
		},
		"fortsheld": {
			"average": {
				"Alsius": [
					51,
					665,
					461,
					19,
					37,
					38,
					25,
					57,
					48
				],
				"Ignis": [
					39,
					34,
					54,
					136,
					425,
					361,
					34,
					39,
					58
				],
				"Syrtis": [
					55,
					83,
					41,
					36,
					31,
					46,
					130,
					469,
					315
				]
			},
			"total": {
				"Alsius": 5599,
				"Ignis": 6923,
				"Syrtis": 6776
			},
			"count": {
				"Alsius": [
					0,
					0,
					0,
					310,
					130,
					120,
					515,
					153,
					176
				],
				"Ignis": [
					900,
					95,
					168,
					0,
					0,
					0,
					343,
					109,
					193
				],
				"Syrtis": [
					589,
					93,
					93,
					500,
					159,
					206,
					0,
					0,
					0
				]
			}
		},
		"generation_time": 0.08012199401855469
	},
	{
		"Alsius": {
			"forts": {
				"total": 299,
				"recovered": 169,
				"captured": 130,
				"most_captured": {
					"name": "Fort Herbred",
					"count": 57
				}
			},
			"invasions": {
				"invaded": {
					"count": 4
				},
				"last": {
					"location": "Ignis",
					"date": 1789739461
				},
				"count": 6
			},
			"gems": {
				"stolen": {
					"last": 1789739941,
					"count": 8
				}
			},
			"wishes": {
				"count": 1,
				"last": 1789731301
			}
		},
		"Ignis": {
			"forts": {
				"total": 278,
				"recovered": 124,
				"captured": 154,
				"most_captured": {
					"name": "Fort Aggersborg",
					"count": 97
				}
			},
			"invasions": {
				"invaded": {
					"count": 5
				},
				"last": {
					"location": "Alsius",
					"date": 1789808286
				},
				"count": 3
			},
			"gems": {
				"stolen": {
					"last": 1789808761,
					"count": 6
				}
			},
			"wishes": {
				"count": 1,
				"last": 1789806301
			}
		},
		"Syrtis": {
			"forts": {
				"total": 292,
				"recovered": 127,
				"captured": 165,
				"most_captured": {
					"name": "Fort Aggersborg",
					"count": 68
				}
			},
			"invasions": {
				"invaded": {
					"count": 4
				},
				"last": {
					"location": "Ignis",
					"date": 1789953421
				},
				"count": 4
			},
			"gems": {
				"stolen": {
					"last": 1789954261,
					"count": 10
				}
			},
			"wishes": {
				"count": 1,
				"last": 1789455901
			}
		}
	},
	{
		"Alsius": {
			"forts": {
				"total": 1429,
				"recovered": 796,
				"captured": 633,
				"most_captured": {
					"name": "Fort Herbred",
					"count": 227
				}
			},
			"invasions": {
				"invaded": {
					"count": 29
				},
				"last": {
					"location": "Ignis",
					"date": 1789739461
				},
				"count": 38
			},
			"gems": {
				"stolen": {
					"last": 1789739941,
					"count": 53
				}
			},
			"wishes": {
				"count": 7,
				"last": 1789731301
			}
		},
		"Ignis": {
			"forts": {
				"total": 1405,
				"recovered": 631,
				"captured": 774,
				"most_captured": {
					"name": "Fort Aggersborg",
					"count": 389
				}
			},
			"invasions": {
				"invaded": {
					"count": 31
				},
				"last": {
					"location": "Alsius",
					"date": 1789808286
				},
				"count": 22
			},
			"gems": {
				"stolen": {
					"last": 1789808761,
					"count": 37
				}
			},
			"wishes": {
				"count": 5,
				"last": 1789806301
			}
		},
		"Syrtis": {
			"forts": {
				"total": 1349,
				"recovered": 599,
				"captured": 750,
				"most_captured": {
					"name": "Fort Aggersborg",
					"count": 230
				}
			},
			"invasions": {
				"invaded": {
					"count": 33
				},
				"last": {
					"location": "Ignis",
					"date": 1789953421
				},
				"count": 33
			},
			"gems": {
				"stolen": {
					"last": 1789954261,
					"count": 57
				}
			},
			"wishes": {
				"count": 8,
				"last": 1789455901
			}
		}
	},
	{
		"Alsius": {
			"forts": {
				"total": 3163,
				"recovered": 1674,
				"captured": 1489,
				"most_captured": {
					"name": "Fort Herbred",
					"count": 515
				}
			},
			"invasions": {
				"invaded": {
					"count": 65
				},
				"last": {
					"location": "Ignis",
					"date": 1789739461
				},
				"count": 85
			},
			"gems": {
				"stolen": {
					"last": 1789739941,
					"count": 98
				}
			},
			"wishes": {
				"count": 16,
				"last": 1789731301
			}
		},
		"Ignis": {
			"forts": {
				"total": 3311,
				"recovered": 1447,
				"captured": 1864,
				"most_captured": {
					"name": "Fort Aggersborg",
					"count": 900
				}
			},
			"invasions": {
				"invaded": {
					"count": 73
				},
				"last": {
					"location": "Alsius",
					"date": 1789808286
				},
				"count": 56
			},
			"gems": {
				"stolen": {
					"last": 1789808761,
					"count": 85
				}
			},
			"wishes": {
				"count": 11,
				"last": 1789806301
			}
		},
		"Syrtis": {
			"forts": {
				"total": 3186,
				"recovered": 1473,
				"captured": 1713,
				"most_captured": {
					"name": "Fort Aggersborg",
					"count": 589
				}
			},
			"invasions": {
				"invaded": {
					"count": 79
				},
				"last": {
					"location": "Ignis",
					"date": 1789953421
				},
				"count": 73
			},
			"gems": {
				"stolen": {
					"last": 1789954261,
					"count": 132
				}
			},
			"wishes": {
				"count": 21,
				"last": 1789455901
			}
		}
	}
];

export default statsBackfill;
