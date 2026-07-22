import { paginationParams } from './pagination';

describe('paginationParams', () => {
  it('defaults itemsPerPage to 20 and omits page when no filters are given', () => {
    expect(paginationParams()).toEqual({ itemsPerPage: '20' });
    expect(paginationParams({})).toEqual({ itemsPerPage: '20' });
  });

  it('sends the given itemsPerPage instead of the default', () => {
    expect(paginationParams({ itemsPerPage: 5 })).toEqual({
      itemsPerPage: '5',
    });
  });

  it('includes page only when given, alongside the default itemsPerPage', () => {
    expect(paginationParams({ page: 3 })).toEqual({
      page: '3',
      itemsPerPage: '20',
    });
  });

  it('includes both page and itemsPerPage when both are given', () => {
    expect(paginationParams({ page: 2, itemsPerPage: 50 })).toEqual({
      page: '2',
      itemsPerPage: '50',
    });
  });
});
