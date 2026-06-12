import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiHttpService } from './_service/api-http.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  imports: [RouterOutlet, MatProgressBarModule, AsyncPipe],
})
export class AppComponent {
  private apiHttpService = inject(ApiHttpService);
  loading$ = this.apiHttpService.loading$;
}
