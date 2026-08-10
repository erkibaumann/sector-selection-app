import { TestBed } from '@angular/core/testing';

import { SubmissionApi } from './submission-api';

describe('SubmissionApi', () => {
  let service: SubmissionApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubmissionApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
