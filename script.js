'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllBtn = document.querySelector('.delete-all_btn');
const sortBtn = document.querySelector('.sort_btn');

// implementing parent workout class
class Workout {
  clicks = 0;
  date = new Date();
  id = (Date.now() + '').slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; //  km
    this.duration = duration; //  min
  }

  _setDescription() {
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _click() {
    this.clicks++;
  }
}

// implementing child workout for running
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// implementing child workout for cycling
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
// Class App
class App {
  // private properties
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];

  constructor() {
    // get user position
    this._getPosition();
    // get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    // workout
    form.addEventListener('submit', this._newWorkout.bind(this));

    // toggle the form
    inputType.addEventListener(
      'change',
      this._toggleEleveationField.bind(this)
    );
    containerWorkouts.addEventListener('click', this._moveToMark.bind(this));
    containerWorkouts.addEventListener('click', this._edit.bind(this));
    containerWorkouts.addEventListener('click', this._delete.bind(this));
    deleteAllBtn.addEventListener('click', this._deleteAll.bind(this));
    sortBtn.addEventListener('click', this._sort.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Coudn't get your location");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // console.log(`https://www.google.com/maps/@${latitude},${longitude},19z`);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
        })
      )
      .setPopupContent('My location')
      .openPopup();

    //handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    //render stored marker
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleEleveationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // if workout running,create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      )
        return alert('Inputs must be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout cycling,create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !positiveInputs(distance, duration)
      )
        return alert('Inputs must be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new object to workout array
    this.#workouts.push(workout);
    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // render workout on list
    this._renderWorkoutList(workout);
    // hide form + clear input fields
    this._hideForm();
    // save to local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
   
<li class="workout workout--${workout.type}" data-id=${workout.id}>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃' : '🚴'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    
    
    `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
    <button type ="submit" class="btn edit_btn" >edit</button>
    <button type ="submit" class="btn delete_btn" >delete</button>
  </li>
      `;

    if (workout.type === 'cycling')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
    <button type ="submit" class="btn edit_btn" >edit</button>
    <button type ="submit" class="btn delete_btn" >delete</button>
    
  </li> -->
      `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMark(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    workout._click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    // restore the data
    this.#workouts = data;
    // console.log(this.#workouts);
    this.#workouts.forEach(workout => {
      this._renderWorkoutList(workout);
      workout.__proto__ =
        workout.type === 'running' ? Running.prototype : Cycling.prototype;
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _edit(e) {
    const editBtn = e.target.closest('.edit_btn');
    if (!editBtn) return;
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    let workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);

    this._showForm();

    //////
    form.addEventListener(
      'submit',
      function (e) {
        e.preventDefault();
        const coords = workout.coords;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const type = inputType.value;
        const validInputs = (...inputs) =>
          inputs.every(inp => Number.isFinite(inp));

        const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);
        let editedWorkout;

        if (type === 'running') {
          const cadence = +inputCadence.value;
          if (
            !validInputs(distance, duration, cadence) ||
            !positiveInputs(distance, duration, cadence)
          )
            return alert('Inputs must be positive numbers!');

          editedWorkout = new Running(coords, distance, duration, cadence);
        }
        if (type === 'cycling') {
          const elevation = +inputElevation.value;
          if (
            !validInputs(distance, duration, elevation) ||
            !positiveInputs(distance, duration)
          )
            return alert('Inputs must be positive numbers!');

          editedWorkout = new Cycling(coords, distance, duration, elevation);
        }

        editedWorkout.id = workout.id;

        let remainingArray = this.#workouts.filter(
          work => work.id !== workout.id
        );

        this.#workouts = remainingArray;

        let keys = Object.keys(editedWorkout);
        keys.map(x => {
          workout[x] = editedWorkout[x];
        });

        this.#workouts.push(workout);
        this._workOutDisplay(workoutEl);
        this._hideForm();
        this._renderWorkoutMarker(workout);
        this._renderWorkoutList(workout);
        this._setLocalStorage();
        location.reload();
      }.bind(this)
    );
  }

  _delete(e) {
    const deleteBtn = e.target.closest('.delete_btn');
    if (!deleteBtn) return;
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    const remainingArray = this.#workouts.filter(
      work => work.id !== workout.id
    );
    this.#workouts = remainingArray;
    this._workOutDisplay(workoutEl);
    this._renderWorkoutMarker(workout);
    this._renderWorkoutList(workout);
    this._setLocalStorage();
    location.reload();
  }

  _workOutDisplay(workoutEl) {
    workoutEl.style.display = 'none';
    setTimeout(() => (workoutEl.style.display = 'grid'), 1000);
  }

  _deleteAll() {
    this.reset();
  }

  _sort() {
    this.#workouts = this.#workouts.sort((a, b) => b.distance - a.distance);
    this._setLocalStorage();
    location.reload();
  }
}

////////////////////////////////////////////////////////////////////////////
// creting app object
const app = new App();
