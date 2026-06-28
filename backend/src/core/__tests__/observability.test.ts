import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockError } = vi.hoisted(() => ({ mockError: vi.fn() }));

vi.mock('../logger.js', () => ({
  getLogger: () => ({ error: mockError }),
}));

import { getRequestId, captureException, REQUEST_ID_HEADER } from '../observability.js';

describe('getRequestId', () => {
  it('reuses an inbound x-request-id header', () => {
    expect(getRequestId({ headers: { [REQUEST_ID_HEADER]: 'abc-123' } })).to.equal('abc-123');
  });

  it('uses the first value when the header is an array', () => {
    expect(getRequestId({ headers: { [REQUEST_ID_HEADER]: ['first', 'second'] } })).to.equal('first');
  });

  it('mints a new id when the header is absent', () => {
    const id = getRequestId({ headers: {} });
    expect(typeof id).to.equal('string');
    expect(id.length).to.be.greaterThan(0);
  });

  it('mints a new id when headers are undefined', () => {
    const id = getRequestId({});
    expect(typeof id).to.equal('string');
    expect(id.length).to.be.greaterThan(0);
  });

  it('mints distinct ids across calls', () => {
    expect(getRequestId({})).to.not.equal(getRequestId({}));
  });
});

describe('captureException', () => {
  beforeEach(() => mockError.mockClear());

  it('logs the error together with the supplied context', () => {
    const err = new Error('boom');
    captureException(err, { requestId: 'r1', operationName: 'doThing' });

    expect(mockError).toHaveBeenCalledTimes(1);
    const [payload, message] = mockError.mock.calls[0];
    expect(payload).to.deep.include({ err, requestId: 'r1', operationName: 'doThing' });
    expect(message).to.equal('unhandled_error');
  });

  it('works with no context', () => {
    captureException(new Error('x'));
    expect(mockError).toHaveBeenCalledTimes(1);
  });
});
