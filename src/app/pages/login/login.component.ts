import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { ContentService, AuthService } from '../../core';
import { $loginAnimations } from './login-animations';
import { Subscription } from 'rxjs';

type pageTypes = 'sign-in' | 'register' | 'reset' | 'change-password' | 'change-email' | 'delete';

@Component({
  selector : 'wm-login',
  templateUrl : './login.component.html',
  styleUrls : ['./login.component.scss'],
  animations: $loginAnimations
})
export class LoginComponent implements OnInit, OnDestroy  {

  private page: pageTypes;
  private error: string = null;
  private progress = false;
  private msgs = null;
  private hide = true;

  private form: FormGroup;
  private name: FormControl;
  private email: FormControl;
  private password: FormControl;
  private newEmail: FormControl;
  private newPassword: FormControl;
  private subNav: Subscription;
  private subAuth: Subscription;
  
  constructor(private content: ContentService,
              private router : Router, 
              private route : ActivatedRoute,
              private auth: AuthService) {

    // Creates the loging form controls
    this.name = new FormControl(null, Validators.required);
    this.email = new FormControl(null, [Validators.required, Validators.email]);
    this.password = new FormControl(null, Validators.required);
    this.newEmail = new FormControl(null, [Validators.required, Validators.email]);
    this.newPassword = new FormControl(null, Validators.required);
    
    // Group the controls
    this.form = new FormGroup({});

    // Makes sure to start from the sign-in page
    this.switchPage(this.page = 'sign-in');
  }

  ngOnInit() {

    // Gets the localized contents
    this.msgs = this.content.select("login");

    // Discrimnate among the login option using the queryParameters
    this.subNav = this.route.queryParamMap.subscribe( (params: ParamMap) => {

      let mode = params.get('mode') || 'login';

      console.log('login mode: ' + mode);

      // If we are coming here 'cause of signout then:
      if(mode === 'logout') {
        this.signOut();
      }

      // This option turns the page into the Password change
      if(mode === 'change-password') {
        this.switchPage('change-password');
      }

      // This option turns the page into the Email change
      if(mode === 'change-email') {
        this.switchPage('change-email');
      }

      // This option ask for re-authentication prior to delete the user profile and data
      if(mode === 'delete') {
        this.switchPage('delete');
      }

    });

    // Monitors the user signing-in and jumps to the projects browser on success
    // This also works to prevent opening the login page when already logged-in
    this.subAuth = this.auth.userData$.subscribe( user => {

      // Jumps to the projects browser on successful login
      if(user) {
        console.log('logged in successfully as: ' + user.email);

        // Navigate to the requested page only if coming from a login procedure
        if(this.progress) {
          this.progress = false;

          // Checks for user preferrend language
          let userLang = user.lang || 'en';

          // Jump to the projects browser switching to the user language if needed
          this.content.switch(userLang, 'projects');
        }
      }
    });
   }

  ngOnDestroy() {
    this.subNav.unsubscribe();
    this.subAuth.unsubscribe();
  }

  // This function switches among the form controls configurations dynamically 
  // to support 'morphing' across the different pages
  private switchPage(page: pageTypes) {

    this.progress = false;

    // Removes all the controls from the form group
    Object.keys(this.form.controls).forEach( control => {
      this.form.removeControl(control);
    });
    
    // Add the relevant controls to the form according to selected page
    switch(this.page = page) {

      case 'register':
      this.form.addControl('name', this.name);
      this.form.addControl('email', this.email);
      this.form.addControl('password', this.password);
      break;

      default:
      case 'sign-in':
      case 'delete':
      this.form.addControl('email', this.email);
      this.form.addControl('password', this.password);      
      break;

      case 'reset':
      this.form.addControl('email', this.email);
      break;

      case 'change-password':
      this.form.addControl('email', this.email);
      this.form.addControl('password', this.password);
      this.form.addControl('newPassword', this.newPassword);
      break;

      case 'change-email':
      this.form.addControl('email', this.email);
      this.form.addControl('password', this.password);
      this.form.addControl('newEmail', this.newEmail);
      break;
    }
  }

  private get pageTitle(): string {

    let key = this.page.camelize();
    return this.msgs.pages[key].title;
  }

  private get buttonCaption(): string {
    
    let key = this.page.camelize();
    return this.msgs.pages[key].caption; 
  }

  private errorMessage(error: string): string {

    // Turns the message code into camelCase
    let key = error.camelize().replace('/','.');

    // Look up the available error messages or return the error code if not found
    return this.content.select("login.errors." + key, error);
  }

  private signInOrRegister() {
    
    switch(this.page) {

      default:
      case 'sign-in':
      this.signIn( this.email.value, 
                   this.password.value );
      break;

      case 'register':
      this.registerNew( this.email.value, 
                        this.password.value, 
                        this.name.value );
      break;

      case 'reset':
      //this.resetPassword( this.email.value );
      break;

      case 'change-password':
      break;

      case 'change-email':
      break;

      case 'delete':
      break;
    }
  }

  private signInWith(provider: string) { 

    this.progress = true;

    // Signing-in with a provider using the current language    
    this.auth.signInWith( provider, this.content.language )
      .catch( error => {
        // Keep the rror code on failure
        this.error = error.code;
        this.progress = false;
      })
  }

  private signIn(email: string, password: string) {
    
    this.progress = true;

    // Sign-in using email/password
    this.auth.signIn(email, password)
      .catch( error => {
      // Keep the rror code on failure
      this.error = error.code;
      this.progress = false;
    });
  }

  private registerNew(email: string, password: string,name: string) {

    this.progress = true;

    // Signing-in with a email/password using the current language
    this.auth.registerNew(email, password, name, this.content.language )
      .catch( error => {
        // Keep the rror code on failure
        this.error = error.code;
        this.progress = false;
      });
  }

  private resetPassword(email: string) {
    
    this.progress = true;

    this.auth.resetPassword(email)
      .catch( error => {
        // Keep the rror code on failure
        this.error = error.code;
        this.progress = false;
      })
  }

  private signOut(){
    
    // Sign-out...
    this.auth.signOut();

    //...and navigate to home overwriting the logout route to prevent unwanted
    // behaviours in case of navigating back after logout
    this.router.navigate(['..','home'], { 
        relativeTo: this.route,
        replaceUrl: true
      }
    );
  }
}  