import { Injectable } from '@angular/core';
import { DatabaseService, PagedCollection, PageConfig, dbStreamFn, UserProfile, wmUser } from '@wizdm/connect';
import { Observable, BehaviorSubject, of, from, merge } from 'rxjs';
import { tap, map, take, filter, debounceTime } from 'rxjs/operators';
import { Project, wmProject } from './project';

@Injectable({
  providedIn: 'root'
})
export class ProjectService extends PagedCollection<wmProject> {

  constructor(db: DatabaseService, readonly profile: UserProfile) {
    super(db, '/projects');
  }

  // Current user id
  public get userId(): string { return this.profile.id; }

  /**
   * Checks if a specific projects belong to the current user
   * @param project the project to verify
   */
  public isProjectMine(project: wmProject): boolean {
    return project.author === this.profile.id;
  }

  public resolveAuthor(project: wmProject): Observable<wmUser> {
    
    // Short-circuit in case the author is the current user
    if( project.author === this.profile.id ) {
      return of(this.profile.data);
    }

    // Load the author data once
    return this.db.document<wmUser>('/users', project.author).get();
  }

  /**
   * Verifies if a project with the specified name already exists
   * @param name name of the project
   */
  public doesProjectExists(name: string): Promise<boolean> {
    
    // Query the projects collection searching for a matching lowerCaseName
    return this.stream(ref => ref.where('lowerCaseName', '==', name.trim().toLowerCase()) )
      .pipe(
        debounceTime(500),
        take(1),
        map(arr => arr.length > 0),
      ).toPromise();
  }

  // Helper to snitize the Project's data payload
  public sanitizeData(data: any): any {
    // Trims the name and creates a lower case version of it for searching purposes 
    if(!!data.name) {
      data.name = data.name.trim();
      data.lowerCaseName = data.name.toLowerCase();
    }
    // Makes sure the data payload always specifies the author
    data.author = this.userId;
    // Returns the very same object instance
    return data;
  }

  public project(id: string): Project {
    return new Project(this, { id } as wmProject);
  }

  public addProject(data: wmProject): Promise<Project> {
    return super.add( this.sanitizeData(data) )
      .then( doc => {
        return this.project(doc.id);
      });
  }

  public browseAll(opts?: PageConfig): Observable<Project[]> {
    // Re-initzialize the page configuration
    if(!!opts) { this.config = this.init(opts);}
    // Returns a paged stream mapping the output to Project[]
    return this.streamPage<Project>(
      map( (projects: wmProject[]) => {
        return projects.map( project => {
          return new Project(this, project);
        }); 
      })
    );
  }

  // Query function to filter my own projects only
  private get myOwmProjects(): dbStreamFn {
    return ref => ref.where('author', '==', this.profile.id);
  }

  public loadMine(): Observable<Project[]> {

    return this.get(this.myOwmProjects)
      .pipe( map( projects => {
        return projects.map( project => {
          return new Project(this, project);
        });
      }));
  }
}
