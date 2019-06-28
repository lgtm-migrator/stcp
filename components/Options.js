import React, { Component } from "react";
import { TextInput, View, Alert, AsyncStorage } from "react-native";
import { LineInfo, Line, Destination, DefaultTheme } from "../constants/Styles";
import { PROVIDERS, STOPS_KEY, PROVIDERS_DATA } from "../constants/Strings";
import { ThemeProvider } from "styled-components";
import { FlatList, TouchableOpacity } from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/Ionicons";
import { withNavigation } from "react-navigation";
import { fetchURL, loadStops } from "../constants/AuxFunctions";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Dropdown } from "react-native-material-dropdown";
import SUBWAY_STOPS from "../constants/stops";

class Options extends Component {
  state = {
    stopsList: undefined,
    newStop: "",
    newProvider: PROVIDERS_DATA[0].value
  };

  constructor(props) {
    super(props);
  }

  async findPlace(query, autocomplete, maxResults) {
    let apiUrl =
      "https://api.tomtom.com/search/2/poiSearch/" +
      encodeURIComponent(query) +
      ".JSON?key=" +
      "3NzwzZQK1ZXxP1DJE7q1ihbEOQ9GogJM" +
      "&typeahead=" +
      autocomplete +
      "&limit=" +
      maxResults +
      "&countrySet=PT" +
      "&lat=" +
      "41.14961" +
      "&lon=" +
      "-8.61099";

    let placeResults = await fetch(apiUrl)
      .then(resp => resp.json())
      .then(resp => {
        try {
          let results = resp.results;

          let places = [];
          for (let val of results) {
            if ("poi" in val) {
              places.push({
                name: val.poi.name,
                address: val.address.freeformAddress,
                lat: val.position.lat,
                lon: val.position.lon
              });
            } else {
              places.push({
                name: val.address.freeformAddress,
                address: val.address.freeformAddress,
                lat: val.position.lat,
                lon: val.position.lon
              });
            }
          }
          return places;
        } catch (error) {
          return [];
        }
      });
    return placeResults[0];
  }

  async loadLocation({ provider, stop }) {
    const coords = {
      x: 0,
      y: 0
    };

    if (provider === PROVIDERS.STCP) {
      const url =
        "https://www.stcp.pt/pt/itinerarium/callservice.php?action=srchstoplines&stopcode=" +
        stop;
      const res = JSON.parse(await fetchURL(url))[0].geomdesc;
      const coordinates = JSON.parse(res).coordinates;

      coords.x = coordinates[1];
      coords.y = coordinates[0];
    } else if (provider === PROVIDERS.METRO) {
      try {
        const { lat, lon } = await this.findPlace("metro " + stop, true, 1);

        coords.x = lat;
        coords.y = lon;
      } catch (error) {
        console.log(error);
      }
    }

    return coords;
  }

  async saveStops() {
    await AsyncStorage.setItem(STOPS_KEY, JSON.stringify(this.state.stopsList));
  }

  async _loadStops() {
    const stops = await loadStops();
    this.setState({ stopsList: stops });
  }

  componentDidMount() {
    const { navigation } = this.props;
    this.focusListener = navigation.addListener("willBlur", () => {
      this.saveStops();
    });

    this._loadStops();
  }

  componentWillUnmount() {
    this.saveStops();
  }

  renderList = () => {
    if (this.state.stopsList !== undefined) {
      return (
        <FlatList
          data={this.state.stopsList}
          keyExtractor={item => item.stop}
          renderItem={this.renderItem}
        />
      );
    }
  };

  removeStop(stopToRemove) {
    const list = this.state.stopsList;
    const newList = list.filter(({ stop }) => {
      return stop != stopToRemove;
    });

    this.setState({ stopsList: newList });
  }

  addStop = async () => {
    try {
      const provider = this.state.newProvider;
      const stopToAdd = this.state.newStop.toUpperCase();

      if (provider === PROVIDERS.METRO) {
        if (
          !SUBWAY_STOPS.includes(
            stopToAdd
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
          )
        )
          throw new Error("Invalid Stop");
      }

      const list = this.state.stopsList;
      if (list.filter(({ stop }) => stop === stopToAdd).length !== 0) {
        alert("Repeated Stop");
        return;
      }
      const location = await this.loadLocation({ provider, stop: stopToAdd });

      const newList = list.concat({
        provider,
        stop: stopToAdd,
        coords: location
      });

      this.setState({ stopsList: newList, newStop: "" });
    } catch (error) {
      console.log(error);
      Alert.alert("Invalid Stop");
    }
  };

  renderItem = ({ item }) => {
    return (
      <LineInfo style={{ paddingLeft: 10, paddingRight: 10 }}>
        <Line>{item.provider}</Line>
        <Destination>{item.stop}</Destination>
        <TouchableOpacity onPress={() => this.removeStop(item.stop)}>
          <Icon name="ios-remove-circle-outline" size={40} />
        </TouchableOpacity>
      </LineInfo>
    );
  };

  _handleNewStop = text => {
    this.setState({ newStop: text });
  };

  _handlePicker = value => {
    this.state.newProvider = value;
  };

  render() {
    return (
      <ThemeProvider theme={DefaultTheme}>
        <KeyboardAwareScrollView>
          {this.renderList()}
          <View style={{ flexDirection: "row" }}>
            <Dropdown
              label="Provider"
              data={PROVIDERS_DATA}
              value={this.state.newProvider}
              containerStyle={{ width: "25%" }}
              onChangeText={this._handlePicker}
            />
            <TextInput
              style={{ width: "65%", fontSize: 20 }}
              editable={true}
              maxLength={20}
              onChangeText={this._handleNewStop}
              value={this.state.newStop}
              placeholder="Insert new stop"
            />
            <TouchableOpacity onPress={this.addStop}>
              <Icon name="ios-add" size={40} />
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </ThemeProvider>
    );
  }
}

export default withNavigation(Options);
