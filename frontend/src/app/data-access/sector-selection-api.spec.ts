import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Sector } from '../models/sector';
import { Submission } from '../models/submission';
import { SectorSelectionApi } from './sector-selection-api';

describe('SectorSelectionApi', () => {
  let service: SectorSelectionApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SectorSelectionApi);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads sectors from the API', () => {
    const expectedSectors: Sector[] = [
      {
        id: 1,
        parent_id: null,
        name: 'Manufacturing',
      },
      {
        id: 19,
        parent_id: 1,
        name: 'Construction materials',
      },
    ];

    let receivedSectors: Sector[] | undefined;

    service.getSectors().subscribe((sectors) => {
      receivedSectors = sectors;
    });

    const request = httpTesting.expectOne('/api/sectors');

    expect(request.request.method).toBe('GET');

    request.flush({
      data: expectedSectors,
    });

    expect(receivedSectors).toEqual(expectedSectors);
  });

  it('saves a submission', () => {
    const submission: Submission = {
      name: 'Ada Lovelace',
      sector_ids: [1, 19],
      agreed_to_terms: true,
    };

    let receivedSubmission: Submission | undefined;

    service.saveSubmission(submission).subscribe((savedSubmission) => {
      receivedSubmission = savedSubmission;
    });

    const saveRequest = httpTesting.expectOne('/api/submission');

    expect(saveRequest.request.method).toBe('POST');
    expect(saveRequest.request.body).toEqual(submission);

    saveRequest.flush({
      data: submission,
    });

    expect(receivedSubmission).toEqual(submission);
  });

  it('loads the current session submission', () => {
    const submission: Submission = {
      name: 'Ada Lovelace',
      sector_ids: [1, 19],
      agreed_to_terms: true,
    };

    let receivedSubmission: Submission | null | undefined;

    service.getSubmission().subscribe((savedSubmission) => {
      receivedSubmission = savedSubmission;
    });

    const request = httpTesting.expectOne('/api/submission');

    expect(request.request.method).toBe('GET');

    request.flush({
      data: submission,
    });

    expect(receivedSubmission).toEqual(submission);
  });

  it('returns null when the session has no submission', () => {
    let receivedSubmission: Submission | null | undefined;

    service.getSubmission().subscribe((submission) => {
      receivedSubmission = submission;
    });

    const request = httpTesting.expectOne('/api/submission');

    expect(request.request.method).toBe('GET');

    request.flush(null, {
      status: 204,
      statusText: 'No Content',
    });

    expect(receivedSubmission).toBeNull();
  });
});
