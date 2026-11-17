'use strict';

const charts = [
  {
    name: 'First Light',
    district: 'The Outer Roads',
    note: 'East on the blue chart is west on the rose chart. North and south are shared.',
    par: 9,
    waters: [
      ['........','.....#..','.....*..','..S.....','......H.','........'],
      ['........','..*.....','.....#..','.....S..','.H......','........'],
    ],
  },
  {
    name: 'The Breakwater',
    district: 'The Stone Narrows',
    note: 'A reef can hold one ferry in place while its twin keeps moving. Use the shoreline as an extra rudder.',
    par: 12,
    waters: [
      ['#.......','...##.H.','...#....','.S.#..*.','......#.','.#......'],
      ['........','.#..#...','.*..#.S.','....#...','.H......','.......#'],
    ],
  },
  {
    name: 'Slack Water',
    district: 'The Turning Lock',
    note: 'Gold locks open at flood. Each order turns the tide after movement. Use Hold to turn it in place.',
    par: 10,
    waters: [
      ['###...##','..#.H.##','..#*..##','.S.F...#','..#...##','###...##'],
      ['##....##','##..#.##','##..#.S.','.#F.#...','.H.*#...','##......'],
    ],
  },
  {
    name: 'The Glass Locks',
    district: 'The Inner Sound',
    note: 'Violet locks open at ebb. The two ferries can face different locks on the same order.',
    par: 13,
    waters: [
      ['...#....','.S.E.*..','...#..#.','.###..#.','......F.','......H.'],
      ['...#....','...#..S.','.H.F....','...#..#.','..*#..#.','...E....'],
    ],
  },
  {
    name: 'Crossing Wakes',
    district: 'The Lantern Banks',
    note: 'A moored ferry stays put. Send one home early to steer the other on its own.',
    par: 21,
    waters: [
      ['.S..#..H','.##.F##.','......#.','.####.#.','..*...E.','........'],
      ['....#...','.HF.#.S.','..#.#.#.','..E...#.','###.#.#.','..*.....'],
    ],
  },
  {
    name: 'The Long Night',
    district: 'The Far Lantern',
    note: 'Bring both signal lights through the last chain of locks. Make every tide count.',
    par: 18,
    waters: [
      ['##..E...','.S..#...','.#..#F##','.#F.#...','...#..*.','##..#..H'],
      ['...#...S','.H.E..#.','##.###F.','...*....','..#.###.','......#.'],
    ],
  },
];