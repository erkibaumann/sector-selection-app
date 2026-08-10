import { TestBed } from '@angular/core/testing';

import { SubmissionApi } from './submission-api';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideHttpClient} from '@angular/common/http';
import {Sector} from '../models/sector';

describe('SubmissionApi', () => {
  let service: SubmissionApi;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SubmissionApi);
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
        name: 'Manufacturing'
      },
      {
        id: 19,
        parent_id: 1,
        name: 'Construction Materials'
      }
    ];

    let receivedSectors: Sector[] | undefined;

    service.getSectors().subscribe((sectors: Sector[] | undefined) => {
      receivedSectors = sectors;
    })

    const request = httpTesting.expectOne('/api/sectors');

    expect(request.request.method).toBe('GET');

    request.flush({
      data: expectedSectors,
    });

    expect(receivedSectors).toEqual(expectedSectors);
  });
});
