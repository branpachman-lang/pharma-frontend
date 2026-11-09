import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CategoriaForm } from './categoria-form';

describe('CategoriaForm', () => {
  let component: CategoriaForm;
  let fixture: ComponentFixture<CategoriaForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaForm],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriaForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
